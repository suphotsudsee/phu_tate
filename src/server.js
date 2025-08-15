const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createPool({
  connectionLimit: 10,
  host: '192.168.25.122',
  user: 'suphot',
  password: '12345678',
  database: 'registrationdb',
  queueLimit: 0,
}).promise();

/*
const db = mysql.createConnection({
  host: "localhost",
  user: "suphot",
  password: "u2eNBathhjUIS4Q2Vuxj",
  database: "registrationdb",
});
*/
/*
const db1 = mysql.createPool({
  host: '192.168.25.124',
  user: 'root',
  password: '##212224##',
  database: 'hdc',
  connectTimeout: 10000, // กำหนด timeout เป็น 10 วินาที
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();

const db2 = mysql.createPool({

  host: '192.168.25.109',
  user: 'root',
  password: '##212224##',
  database: 'hdc',
  connectTimeout: 10000, // กำหนด timeout เป็น 10 วินาที
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();

const db3 = mysql.createPool({

  host: '192.168.25.121',
  user: 'root',
  password: '##212224##',
  database: 'hdc',
  connectTimeout: 10000, // กำหนด timeout เป็น 10 วินาที
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();
*/

const db4 = mysql.createPool({

  host: '192.168.25.122',
  user: 'root',
  password: '##212224##',
  database: 'hdc',
  connectTimeout: 10000, // กำหนด timeout เป็น 10 วินาที
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();

/*
const db4 = mysql.createConnection({
  host: "192.168.25.122",
  user: "root",
  password: "##212224##",
  database: "hdc",
});
*/

// db4.connect((err) => {
//   if (err) {
//     console.error("ไม่สามารถเชื่อมต่อกับฐานข้อมูล:", err);
//     return;
//   }
//   console.log("เชื่อมต่อกับฐานข้อมูลสำเร็จ");
// });

app.get("/person",async (req, res) => {
try {
  // Query data from MySQL
  const [results] = await db.query("SELECT * FROM users WHERE first_name = 'suphot' limit 10");
  res.json({
    status: "success",
    data: results,
  });
} catch (error) {
  console.error(error);
  res.status(500).json({
    status: "error",
    message: "Something went wrong.",
  });
}
});

app.post("/register", async (req, res) => {
  const { firstName, lastName, idNumber, phone, password } = req.body;
  console.log("======>",{...req.body});

  try {
    // ตรวจสอบว่าหมายเลขประจำตัวประชาชนมีอยู่ในฐานข้อมูลหรือไม่
    const checkSql = "SELECT * FROM users WHERE id_number = ?";
    const results = await db.query(checkSql, [idNumber]);

    if (results.length > 0) {
      // หากมีหมายเลขประจำตัวประชาชนอยู่แล้ว
      res
        .status(400)
        .send({ message: "หมายเลขประจำตัวประชาชนนี้มีอยู่ในระบบแล้ว" });
      return;
    }

    // หากไม่มีหมายเลขประจำตัวประชาชนในระบบ ให้บันทึกข้อมูลใหม่
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertSql =
      "INSERT INTO users (first_name, last_name, id_number, phone, password) VALUES (?, ?, ?, ?, ?)";
      await db.query(insertSql, [firstName, lastName, idNumber, phone, hashedPassword]);

    res.send({ message: "ลงทะเบียนสำเร็จ" });
  } catch (err) {
    console.error("เกิดข้อผิดพลาด:", err);
    res.status(500).send({ message: "เกิดข้อผิดพลาดในการลงทะเบียน" });
  }
});


app.post("/login",async (req, res) => {
  const { idNumber, password } = req.body;
  console.log("======>",{...req.body});

  try {
    // ตรวจสอบว่าหมายเลขประจำตัวประชาชนมีอยู่ในฐานข้อมูลหรือไม่
    const sql = "SELECT * FROM users WHERE id_number = ?";
    const [results] = await db.query(sql, [idNumber]);

    if (!results || results.length === 0) {
      console.error("User ID number is missing");
      res.send({ success: false });
      return;
    }
    const user = results[0];
    console.log("User data:", user);
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      res.send({ success: false });
      return;
    }else {

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

      const [results1] = await db1.query(listLab, [idNumber]);
      const [results2] = await db2.query(listLab, [idNumber]);
      const [results3] = await db3.query(listLab, [idNumber]);
      const [results4] = await db4.query(listLab, [idNumber]);

          // รวมผลลัพธ์ทั้งหมด
          const allResults = [...results1, ...results2, ...results3, ...results4];

          // ตรวจสอบว่ามีข้อมูลใน allResults หรือไม่
          if (allResults.length > 0) {
            console.log("All Results Combined:", allResults);
            res.send({ success: true, results: allResults });
            return;
          }

          // กรณีไม่มีข้อมูล
          res.send({ success: false, message: "ไม่พบข้อมูล" });
      
    }

  } catch (err) {
    console.error("เกิดข้อผิดพลาด:", err);
    res.status(500).send({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลการตรวจเลือด" });
  }
});

app.listen(5001, () => {
  console.log("เซิร์ฟเวอร์กำลังทำงานที่พอร์ต 5001");
});
