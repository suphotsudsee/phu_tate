require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");

const PORT = process.env.PORT || 3088;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// --- DB Connections ---
const db = mysql.createPool({
  host: process.env.DB_HOST || "192.168.25.122",
  user: process.env.DB_USER || "suphot",
  password: process.env.DB_PASS || "12345678",
  database: process.env.DB_NAME || "registrationdb",
  waitForConnections: true,
  connectionLimit: 10,
});

const db4 = mysql.createPool({
  host: process.env.DB_HOST_LAB || "192.168.25.9",
  user: process.env.DB_USER_LAB || "suphot",
  password: process.env.DB_PASS_LAB || "0868757244",
  database: process.env.DB_NAME_LAB || "hdc",
  waitForConnections: true,
  connectionLimit: 10,
});

// --- SQL Helpers ---

// ... (ส่วนบนเหมือนเดิม)

// 1. ดึง Lab ด้วย CID (ตาราง labfu)
const fetchLabByCid = async (cid) => {
  if (!cid) return [];

  const sql = `
SELECT
      p.CID,
      lf.PID,
      lf.DATE_SERV,
      lf.LABTEST,
      COALESCE(ct.TH, ct.EN) AS LABTEST_NAME, -- ชื่อแล็บ (ไทย หรือ อังกฤษ)
      lf.LABRESULT,
      lf.D_UPDATE,
      lf.HOSPCODE,
      lf.LABPLACE,
      h.hosname AS HOSPNAME    -- ดึงชื่อโรงพยาบาลจากตาราง chospital
    FROM person AS p
    JOIN labfu AS lf
      ON lf.HOSPCODE = p.HOSPCODE
      AND lf.PID = p.PID
    LEFT JOIN chospital AS h   -- JOIN กับตารางโรงพยาบาล
      ON h.hospcode = lf.HOSPCODE
    LEFT JOIN clabtest_new AS ct
      ON ct.code = TRIM(lf.LABTEST)
      OR ct.old_code = TRIM(lf.LABTEST)
    WHERE p.CID = ?
    -- หากต้องการเฉพาะ 'น้ำตาล' ให้เปิดบรรทัดด้านล่างนี้ (รวมรหัส 0531102, 0531101, 0531104)
    AND lf.LABTEST IN ('0531102', '0531101', '0531104') 
    ORDER BY lf.DATE_SERV DESC
    LIMIT 20;
  `;

  try {
    console.log("[LAB][CID] query:", sql.trim(), "params:", [cid]);
    const [rows] = await db4.query(sql, [cid]);
    console.log(`[LAB][CID] fetch by CID=${cid} -> ${rows.length} rows`);
    return rows;
  } catch (err) {
    console.error("Lab CID Error:", err.message);
    return [];
  }
};

// ... (ส่วนอื่นๆ ของ server.js เหมือนเดิม)

// 2. ดึง Lab ด้วย HOSPCODE + PID (t_person_cid -> labfu)
const fetchLabByPid = async (hospcode, pid) => {
  if (!hospcode || !pid) return [];

  const sql = `
    SELECT 
      l.HOSPCODE,
      l.PID,
      l.DATE_SERV,
      l.LABTEST,
      COALESCE(ct.TH, ct.EN) AS LABTEST_NAME,
      ct.TH AS LABTEST_TH,
      ct.EN AS LABTEST_EN,
      ct.old_code AS LABTEST_OLD_CODE,
      l.LABRESULT,
      l.LABPLACE,
      h.hosname AS HOSPNAME
    FROM labfu l
    LEFT JOIN clabtest_new AS ct
      ON ct.code = TRIM(l.LABTEST)
      OR ct.old_code = TRIM(l.LABTEST)
    LEFT JOIN chospital AS h   -- JOIN กับตารางโรงพยาบาล
      ON h.hospcode = l.HOSPCODE
    WHERE l.HOSPCODE = ? AND l.PID = ?
    ORDER BY l.DATE_SERV DESC 
    LIMIT 20;
  `;

  try {
    console.log("[LAB][PID] query:", sql.trim(), "params:", [hospcode, pid]);
    const [rows] = await db4.query(sql, [hospcode, pid]);
    console.log(`[LAB][PID] fetch by PID=${pid} HOSPCODE=${hospcode} -> ${rows.length} rows`);
    return rows;
  } catch (err) {
    console.error("Lab PID Error:", err.message);
    return [];
  }
};

// 3. ดึงข้อมูลบุคคลจาก HDC
const fetchPersonFromHDC = async (cid) => {
  if (!cid) return null;
  const sql = `SELECT CID, NAME, LNAME, HOSPCODE, PID FROM t_person_cid WHERE CID = ? LIMIT 1`;
  try {
    console.log("[HDC][PERSON] query:", sql.trim(), "params:", [cid]);
    const [rows] = await db4.query(sql, [cid]);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error("Person HDC Error:", err.message);
    return null;
  }
};

// --- API Routes ---

// API 1: Auto Login (เปิด App)
app.post("/line-auto-login", async (req, res) => {
  const { lineUserId } = req.body;
  if (!lineUserId) return res.status(400).send({ success: false });

  try {
    // 1. หา User ใน Local DB
    const userSql = "SELECT * FROM users WHERE line_user_id = ?";
    console.log("[LOGIN][AUTO] query:", userSql, "params:", [lineUserId]);
    const [users] = await db.query(userSql, [lineUserId]);
    if (users.length === 0) return res.send({ success: false, message: "User not found" });

    let user = users[0];
    const idNumber = (user.id_number || "").trim();

    // 2. ลองหา Lab ด้วย CID ก่อน
    let labResults = await fetchLabByCid(idNumber);

    // 3. ถ้าไม่เจอ Lab ให้ลองไปค้น Person ใน HDC เพื่อเอา PID ไปหา Lab อีกรอบ
    if (labResults.length === 0) {
      console.log(`[AutoLogin] No labs by CID for ${idNumber}, checking HDC...`);
      const hdcPerson = await fetchPersonFromHDC(idNumber);

      if (hdcPerson) {
        // อัปเดตชื่อสกุลให้เป็นปัจจุบัน
        user.first_name = hdcPerson.NAME;
        user.last_name = hdcPerson.LNAME;
        
        // **KEY CHANGE**: เอา HOSPCODE + PID ไปหา Lab ต่อ
        console.log(`[AutoLogin] Found Person. Searching Lab by PID: ${hdcPerson.PID}, HOSP: ${hdcPerson.HOSPCODE}`);
        labResults = await fetchLabByPid(hdcPerson.HOSPCODE, hdcPerson.PID);
        
        // อัปเดตชื่อลง Local DB ไว้ด้วย
        await db.query("UPDATE users SET first_name = ?, last_name = ? WHERE id_number = ?", 
          [hdcPerson.NAME, hdcPerson.LNAME, idNumber]);
      }
    }

    res.send({
      success: true,
      user: {
        idNumber: user.id_number,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      labs: labResults,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false });
  }
});

// API 2: Login / Binding (ลงทะเบียนครั้งแรก)
app.post("/login", async (req, res) => {
  const { idNumber, lineUserId, lineDisplayName } = req.body;
  if (!idNumber) return res.status(400).send({ success: false });

  try {
    // 1. เช็ค HDC ก่อนเลย เพื่อความแม่นยำของข้อมูล
    const hdcPerson = await fetchPersonFromHDC(idNumber);
    
    // เตรียมข้อมูลสำหรับบันทึก
    const firstName = hdcPerson ? hdcPerson.NAME : (lineDisplayName || "LINE User");
    const lastName = hdcPerson ? hdcPerson.LNAME : "";

    // 2. Upsert ลง Local DB
    const upsertSql = `
      INSERT INTO users (id_number, line_user_id, first_name, last_name, phone, password)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        line_user_id = VALUES(line_user_id),
        first_name = VALUES(first_name), 
        last_name = VALUES(last_name)
    `;
    console.log("[LOGIN][UPSERT] query:", upsertSql.trim(), "params:", [idNumber, lineUserId || null, firstName, lastName, "-", "LINE_LOGIN"]);
    await db.query(upsertSql, [idNumber, lineUserId || null, firstName, lastName, "-", "LINE_LOGIN"]);

    // 3. หา Lab (Step 1: By CID)
    let labResults = await fetchLabByCid(idNumber.trim());

    // 4. ถ้าไม่เจอ Lab และมีข้อมูลคน (Step 2: By PID)
    if (labResults.length === 0 && hdcPerson) {
      console.log(`[Login] No labs by CID, switching to PID search...`);
      labResults = await fetchLabByPid(hdcPerson.HOSPCODE, hdcPerson.PID);
    }

    res.send({
      success: true,
      user: { idNumber, firstName, lastName },
      labs: labResults
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
