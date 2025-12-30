import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// 1. นำเข้า LIFF SDK
import liff from '@line/liff';

import Login from "./Login";
import Register from "./Register";
import Person from "./Person";
import BarChart from "./BarChart";

function App() {
  // สถานะ login ของระบบเรา (แยกจากการ login LINE)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // เพิ่ม state สำหรับเก็บข้อมูลผู้ใช้ LINE
  const [lineProfile, setLineProfile] = useState(null);
  const [liffError, setLiffError] = useState(null);

  // 2. ใช้ useEffect เพื่อ Initialize LIFF เมื่อแอปเริ่มทำงาน
  useEffect(() => {
    // ใส่ LIFF ID ที่ได้จาก LINE Developers Console ตรงนี้ หรือกำหนดผ่าน env REACT_APP_LIFF_ID
    const LIFF_ID = process.env.REACT_APP_LIFF_ID || "2008799540-to0v6frF"; 

    if (!LIFF_ID) {
      console.error("Missing LIFF ID");
      setLiffError("Missing LIFF ID");
      return;
    }

    liff
      .init({
        liffId: LIFF_ID, 
        // บังคับให้ Login ถ้าเปิดนอกแอป LINE
        withLoginOnExternalBrowser: true, 
      })
      .then(() => {
        // เริ่มต้น LIFF สำเร็จ
        console.log("LIFF init succeeded");

        // ตรวจสอบว่า user login LINE หรือยัง
        if (liff.isLoggedIn()) {
          // ถ้า login แล้ว ให้ดึงข้อมูลโปรไฟล์
          liff.getProfile().then((profile) => {
            console.log("User profile:", profile);
            setLineProfile(profile);
            // ในบริบท Mini App การที่เขาเปิดเข้ามาได้ แปลว่าเขา Authenticate กับ LINE แล้ว
            // คุณอาจจะถือว่า isAuthenticated = true เลยก็ได้
            // หรือจะเอา userId ไปเช็คกับ Database ของคุณอีกทีก็ได้
            // *** Optional: ถ้าอยากเชื่อมกับระบบ Login เดิม ***
            // คุณอาจจะเอา profile.userId ส่งไปที่ Backend ของคุณ
            // เพื่อตรวจสอบว่า userId นี้ตรงกับ user คนไหนในระบบ MySQL
          });
        } else {
          // ถ้ายังไม่ login (กรณีเปิด external browser แล้วไม่ได้ตั้ง withLoginOnExternalBrowser)
          // liff.login(); 
          setIsAuthenticated(false);
        }
      })
      .catch((e) => {
        console.error("LIFF init failed", e);
        setLiffError(e.toString());
      });
  }, []);


  // ฟังก์ชัน Login แบบเดิม (อาจจะไม่ได้ใช้ ถ้าพึ่งพา LINE Login 100%)
  const handleLogin = () => {
    // ให้ backend login สำเร็จแล้วค่อย set เป็น true
    setIsAuthenticated(true);
  };

  // ฟังก์ชัน Logout แบบเดิม + เพิ่ม LIFF logout
  const handleLogout = () => {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
    setIsAuthenticated(false);
    setLineProfile(null);
    localStorage.removeItem("isAuthenticated"); // เคลียร์ของเก่าด้วย
  };


  // ถ้า LIFF ยังโหลดไม่เสร็จ หรือมี Error อาจจะแสดงหน้า Loading/Error ก่อน
  if (liffError) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h3>เกิดข้อผิดพลาดในการเชื่อมต่อ LINE</h3>
        <p>{liffError}</p>
        <p>กรุณาตรวจสอบ LIFF ID หรือการตั้งค่า</p>
      </div>
    );
  }
  
  // แสดงหน้า Loading ระหว่างรอ LIFF init (optional แต่แนะนำ)
  // if (!lineProfile && !liffError && /* logic check ว่ากำลังโหลดอยู่ */) {
  //   return <div>Loading LINE info...</div>
  // }


  return (
    <Router>
      {/* ส่วนนี้เป็น Navigation bar ตัวอย่าง 
        เพื่อให้เห็นภาพว่าเราเอาข้อมูล LINE มาโชว์ได้ 
      */}
      <nav style={{ padding: 10, background: '#eee', display: 'flex', justifyContent: 'space-between' }}>
        <div>My App</div>
        {lineProfile && (
           <div style={{ display: 'flex', alignItems: 'center' }}>
             <img 
               src={lineProfile.pictureUrl} 
               alt={lineProfile.displayName} 
               style={{ width: 30, height: 30, borderRadius: '50%', marginRight: 10 }} 
             />
             <span>สวัสดี, {lineProfile.displayName}</span>
             <button onClick={handleLogout} style={{marginLeft: 10}}>Logout</button>
           </div>
        )}
      </nav>

      <Routes>
        {/* ปรับ Logic Router:
           ถ้าเปิดใน Mini App เราอาจจะถือว่า login แล้วผ่าน LINE 
           ให้ redirect ไปหน้า Home เลย ไม่ต้องเจอหน้า Login สีฟ้าๆ เดิมอีก
        */}
        <Route
          path="/"
          // ให้ login backend ก่อน ไม่ redirect ด้วย lineProfile อย่างเดียว
          element={isAuthenticated ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/home"
          // แสดง Home เฉพาะหลังจาก login backend แล้ว
          element={isAuthenticated ? <Person /> : <Navigate to="/" />}
        />
        <Route
          path="/chart"
          // เช็คว่ามี lineProfile หรือไม่
          element={lineProfile ? <BarChart /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
