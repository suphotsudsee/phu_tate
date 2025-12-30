require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");

const PORT = process.env.PORT || 3088;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// --- DB CONNECTIONS ---
const db = mysql.createPool({
  host: process.env.DB_HOST || "192.168.25.122",
  user: process.env.DB_USER || "suphot",
  password: process.env.DB_PASS || "12345678",
  database: process.env.DB_NAME || "registrationdb",
  waitForConnections: true,
  connectionLimit: 10,
});

// (DB4 code ... คงเดิม)
const db4 = mysql.createPool({
  host: process.env.DB_HOST || "192.168.25.9",
  user: process.env.DB_USER || "suphot",
  password: process.env.DB_PASS || "12345678",
  database: process.env.DB_NAME_LAB || "hos",
  waitForConnections: true,
  connectionLimit: 10,
});

// --- SQL Queries (ปรับให้ตรงกับตาราง users) ---
// อัปเดต line_user_id โดยใช้ id_number
const updateLineIdSql = "UPDATE users SET line_user_id = ? WHERE id_number = ?";

// ค้นหา user จาก line_user_id
const findUserByLineIdSql = "SELECT * FROM users WHERE line_user_id = ?";

// ค้นหา user จาก id_number
const checkUserSql = "SELECT * FROM users WHERE id_number = ?";

// --- 1. API เช็คว่า LINE ID นี้ผูกกับใครหรือยัง (Auto Login) ---
app.post("/check-line-auth", async (req, res) => {
  const { lineUserId } = req.body;
  
  if (!lineUserId) return res.status(400).send({ success: false });

  try {
    const [users] = await db.query(findUserByLineIdSql, [lineUserId]);
    
    if (users.length > 0) {
      // เจอ! คนนี้เคยผูกบัญชีแล้ว
      const user = users[0];
      
      res.send({ 
        success: true, 
        isBound: true, 
        // Mapping ข้อมูลกลับไปให้ Frontend (แปลงจาก snake_case เป็น camelCase ถ้าจำเป็น)
        user: { 
          idNumber: user.id_number, 
          firstName: user.first_name,
          lastName: user.last_name
        } 
      });
    } else {
      // ไม่เจอ (ยังไม่เคยผูก)
      res.send({ success: true, isBound: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false });
  }
});


// --- 2. API Login เดิม (เพิ่มการผูกบัญชี & ปรับ column) ---
app.post("/login", async (req, res) => {
  const { idNumber, password, lineUserId } = req.body; // รับ idNumber มาจาก Frontend

  try {
    // 1. เช็ค User/Pass (ใช้ idNumber ไปหาในคอลัมน์ id_number)
    const [users] = await db.query(checkUserSql, [idNumber]);
    if (users.length === 0) {
      return res.status(404).send({ success: false, message: "ไม่พบเลขบัตรประชาชนนี้" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
    }

    // 2. ถ้า Login ผ่าน และส่ง lineUserId มาด้วย -> ทำการ "ผูกบัญชี"
    if (lineUserId) {
      // บันทึก lineUserId ลงในตาราง users โดยอ้างอิงจาก id_number
      await db.query(updateLineIdSql, [lineUserId, idNumber]);
      console.log(`Bound Line ID ${lineUserId} to User ${idNumber}`);
    }

    // 3. ดึงผล Lab (Code เดิมของคุณ)
    let labResults = [];
    if (db4) {
       // ... (Logic ดึง lab เดิมของคุณ ใส่ตรงนี้) ...
    }

    res.send({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      user: { 
        idNumber: user.id_number, 
        firstName: user.first_name,
        lastName: user.last_name
      },
      labs: labResults
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Error" });
  }
});

// ... (API Register และอื่นๆ คงเดิม) ...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});