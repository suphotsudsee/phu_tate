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

// Single-service port: default to 3000
const PORT = process.env.PORT || 3000;

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

// Serve React app for any other route
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

// --- START ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`เซิร์ฟเวอร์กำลังทำงานที่พอร์ต ${PORT}`);
});


