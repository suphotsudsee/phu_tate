// server.js (fixed)
// Express API for register/login with MySQL (mysql2/promise)
// - Fixes: correct mysql2 result destructuring, safe unique check, cleaned logs
// - Optional multi-DB lab lookup guarded to avoid ReferenceError

require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const path = require("path");

// Single-service port: default to 3088
const PORT = process.env.PORT || 3088;

// --- DB CONNECTIONS ---------------------------------------------------------
// Primary DB (users)
const db = mysql.createPool({
  host: process.env.DB_HOST || "192.168.25.122",
  user: process.env.DB_USER || "suphot",
  password: process.env.DB_PASS || "12345678",
  database: process.env.DB_NAME || "registrationdb",
  waitForConnections: true,
  connectionLimit: 10,
});

// Optional: Secondary DB for lab results (enable via env)
const   db4 = mysql.createPool({
  host: process.env.DB_HOST || "192.168.25.122",
  user: process.env.DB_USER || "suphot",
  password: process.env.DB_PASS || "12345678",
  database: process.env.DB_NAME || "hdc",
    waitForConnections: true,
    connectionLimit: 10,
  });


// Example lab query (adjust to your schema)
    const listLab = `
      SELECT
        person.HOSPCODE, person.PID, person.CID, person.NAME, person.LNAME,
        person.SEX, labfu.LABTEST, labfu.LABRESULT, labfu.DATE_SERV, clabtest_new.EN ,
chospcode.hospname
      FROM
        person
      INNER JOIN
        labfu ON person.HOSPCODE = labfu.HOSPCODE AND person.PID = labfu.PID
      INNER JOIN
        clabtest_new ON labfu.LABTEST = clabtest_new.code
        INNER JOIN chospcode ON person.HOSPCODE = chospcode.hospcode
      WHERE
        person.CID = ? AND labfu.LABTEST = '0531002'
      ORDER BY
        labfu.DATE_SERV DESC
      LIMIT 10`;

// Thai ASCVD risk query
const cvdRiskQuery = `
  WITH
  one_screen AS (
    SELECT
        p.HOSPCODE,
        p.PID,
        p.CID,
        p.BIRTH,
        CASE WHEN p.SEX = '1' THEN 1 ELSE 0 END AS SEX,
        ns.DATE_SERV      AS SCREEN_DATE,
        COALESCE(ns.SBP_2, ns.SBP_1) AS SBP,
        ns.WAIST_CM       AS WAIST,
        ns.HEIGHT         AS HEIGHT,
        CASE WHEN ns.SMOKE = '3' THEN 1 ELSE 0 END AS SMOKING
    FROM person p
    JOIN ncdscreen ns
      ON ns.HOSPCODE = p.HOSPCODE AND ns.PID = p.PID
    WHERE p.CID = ?
    ORDER BY ns.DATE_SERV DESC
    LIMIT 1
  ),

  tc_latest AS (
    SELECT lf.HOSPCODE, lf.PID,
           lf.DATE_SERV AS TC_DATE,
           CAST(lf.LABRESULT AS DECIMAL(10,2)) AS TC
    FROM labfu lf
    JOIN (
      SELECT HOSPCODE, PID, MAX(DATE_SERV) AS max_date
      FROM labfu
      WHERE LABTEST IN ('TC','TOTALCHOL','TOTAL_CHOL','CHOL','TOTALCHOLESTEROL')
      GROUP BY HOSPCODE, PID
    ) pick ON pick.HOSPCODE = lf.HOSPCODE
          AND pick.PID      = lf.PID
          AND pick.max_date = lf.DATE_SERV
    WHERE lf.LABTEST IN ('TC','TOTALCHOL','TOTAL_CHOL','CHOL','TOTALCHOLESTEROL')
  ),

  dm_flag AS (
    SELECT c.HOSPCODE, c.PID, 1 AS DM
    FROM chronic c
    WHERE c.CHRONIC LIKE 'E10%'
       OR c.CHRONIC LIKE 'E11%'
       OR c.CHRONIC LIKE 'E12%'
       OR c.CHRONIC LIKE 'E13%'
       OR c.CHRONIC LIKE 'E14%'
    GROUP BY c.HOSPCODE, c.PID
  ),

  assemble AS (
    SELECT
      s.CID, s.HOSPCODE, s.PID,
      s.SEX,
      s.SCREEN_DATE,
      t.TC_DATE,
      GREATEST(COALESCE(s.SCREEN_DATE,'0001-01-01'), COALESCE(t.TC_DATE,'0001-01-01')) AS REF_DATE,
      TIMESTAMPDIFF(
        YEAR, s.BIRTH,
        GREATEST(COALESCE(s.SCREEN_DATE,'0001-01-01'), COALESCE(t.TC_DATE,'0001-01-01'))
      ) AS AGE,
      s.SBP,
      COALESCE(d.DM,0) AS DM,
      s.WAIST, s.HEIGHT, s.SMOKING,
      t.TC AS TOTAL_CHOL,
      CASE WHEN s.HEIGHT IS NOT NULL AND s.HEIGHT > 0
           THEN (s.WAIST / s.HEIGHT) ELSE NULL END AS WHR
    FROM one_screen s
    LEFT JOIN tc_latest t ON t.HOSPCODE = s.HOSPCODE AND t.PID = s.PID
    LEFT JOIN dm_flag d   ON d.HOSPCODE = s.HOSPCODE AND d.PID = s.PID
  ),

  calc AS (
    SELECT
      a.CID,
      a.SCREEN_DATE,
      a.TC_DATE,
      a.REF_DATE,
      a.AGE,
      a.SEX,
      a.SBP,
      a.DM,
      a.WAIST,
      a.HEIGHT,
      a.SMOKING,
      a.TOTAL_CHOL,
      a.WHR AS WAIST_HEIGHT_RATIO,

      CASE WHEN a.TOTAL_CHOL IS NOT NULL THEN
        (1 - POW(0.978296, EXP(
            (0.08183 * a.AGE) +
            (0.39499 * a.SEX) +
            (0.02084  * a.SBP) +
            (0.69974  * a.DM)  +
            (0.00212  * a.TOTAL_CHOL) +
            (0.41916  * a.SMOKING)
          - 7.04423
        ))) * 100
      END AS Risk_with_TC_percent,

      CASE WHEN a.TOTAL_CHOL IS NULL AND a.WHR IS NOT NULL THEN
        (1 - POW(0.978296, EXP(
            (0.079       * a.AGE) +
            (0.128       * a.SEX) +
            (0.019350987 * a.SBP) +
            (0.58454     * a.DM)  +
            (3.512566    * a.WHR) +
            (0.459       * a.SMOKING)
          - 7.720484
        ))) * 100
      END AS Risk_no_TC_percent,

      CASE
        WHEN a.TOTAL_CHOL IS NOT NULL THEN
          (1 - POW(0.978296, EXP(
              (0.08183 * a.AGE) +
              (0.39499 * a.SEX) +
              (0.02084  * a.SBP) +
              (0.69974  * a.DM)  +
              (0.00212  * a.TOTAL_CHOL) +
              (0.41916  * a.SMOKING)
            - 7.04423
          ))) * 100
        WHEN a.TOTAL_CHOL IS NULL AND a.WHR IS NOT NULL THEN
          (1 - POW(0.978296, EXP(
              (0.079       * a.AGE) +
              (0.128       * a.SEX) +
              (0.019350987 * a.SBP) +
              (0.58454     * a.DM)  +
              (3.512566    * a.WHR) +
              (0.459       * a.SMOKING)
            - 7.720484
          ))) * 100
        ELSE NULL
      END AS Thai_ASCVD2_Risk_percent
    FROM assemble a
  )

  SELECT
    c.*,
    CASE
      WHEN c.Thai_ASCVD2_Risk_percent IS NULL THEN NULL
      WHEN c.Thai_ASCVD2_Risk_percent > 20 THEN 'สูง'
      WHEN c.Thai_ASCVD2_Risk_percent >= 10 THEN 'กลาง'
      ELSE 'ต่ำ'
    END AS Risk_Category_TH
  FROM calc c;
`;

// --- APP --------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../build")));

// --- REGISTER ---------------------------------------------------------------
app.post("/register", async (req, res) => {
  const { firstName, lastName, idNumber, phone, password } = req.body || {};
  console.log("======>", { firstName, lastName, idNumber, phone }); // avoid logging password

  if (!firstName || !lastName || !idNumber || !phone || !password) {
    return res.status(400).send({ message: "กรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    // Check duplicate id_number
    const checkSql = "SELECT 1 FROM users WHERE id_number = ? LIMIT 1";
    const [rows] = await db.query(checkSql, [idNumber]);

    if (rows.length > 0) {
      return res.status(400).send({ message: "หมายเลขประจำตัวประชาชนนี้มีอยู่ในระบบแล้ว" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert
    const insertSql = `
      INSERT INTO users (first_name, last_name, id_number, phone, password)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.query(insertSql, [firstName, lastName, idNumber, phone, hashedPassword]);

    return res.send({ success: true, message: "ลงทะเบียนสำเร็จ" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).send({ success: false, message: "เกิดข้อผิดพลาดในการลงทะเบียน" });
  }
});

// --- LOGIN ------------------------------------------------------------------
app.post("/login", async (req, res) => {
  const { idNumber, password } = req.body || {};
  console.log("LOGIN ATTEMPT:", { idNumber }); // avoid logging password

  if (!idNumber || !password) {
    return res.status(400).send({ message: "ต้องระบุ idNumber และ password" });
  }

  try {
    // Find user by idNumber
    const [rows] = await db.query(
      "SELECT id, first_name, last_name, id_number, phone, password FROM users WHERE id_number = ? LIMIT 1",
      [idNumber]
    );

    if (rows.length === 0) {
      return res.status(401).send({ success: false, message: "ไม่พบบัญชีผู้ใช้" });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).send({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
    }

    // Minimal profile (exclude password)
    const profile = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      idNumber: user.id_number,
      phone: user.phone,
    };

    // Optional: Query lab results (avoid ReferenceError if db4 is not configured)

    let labResults = [];
    if (db4) {
      try {
        const [results4] = await db4.query(listLab, [idNumber]);
        labResults = results4 || [];
     //   console.log("LAB RESULTS:", labResults); // Log lab results for debugging
        
      } catch (e) {
        console.warn("LAB QUERY WARNING:", e.message);
      }
    }

    return res.send({ success: true, profile, labs: labResults });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).send({ success: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

// --- LABS: public endpoint to get labs by idNumber (optional) --------------
app.get("/labs/:idNumber", async (req, res) => {
  const { idNumber } = req.params;
  if (!db4) return res.status(501).send({ message: "ยังไม่ตั้งค่า DB4" });
  try {
    const [rows] = await db4.query(listLab, [idNumber]);
    res.send({ success: true, results: rows });
  } catch (err) {
    console.error("LABS ERROR:", err);
    res.status(500).send({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลแลบ" });
  }
});

// --- CVD RISK: calculate Thai ASCVD risk by CID -----------------------------
app.get("/cvdrisk/:cid", async (req, res) => {
  const { cid } = req.params;
  if (!db4) return res.status(501).send({ message: "ยังไม่ตั้งค่า DB4" });
  try {
    const [rows] = await db4.query(cvdRiskQuery, [cid]);
    res.send({ success: true, results: rows });
  } catch (err) {
    console.error("CVD RISK ERROR:", err);
    res.status(500).send({ success: false, message: "เกิดข้อผิดพลาดในการคำนวณความเสี่ยง" });
  }
});

// Serve React app for any other route
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

// --- START ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`เซิร์ฟเวอร์กำลังทำงานที่พอร์ต ${PORT}`);
});


