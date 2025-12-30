import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import liff from "@line/liff"; // อย่าลืม import liff

const Login = () => {
  const [formData, setFormData] = useState({
    idNumber: "",
    password: "",
  });
  const [lineUserId, setLineUserId] = useState(""); // เก็บ LINE ID
  const navigate = useNavigate();

  useEffect(() => {
    // พยายามดึง LINE ID มารอไว้ก่อน
    const initLiff = async () => {
      const liffId = process.env.REACT_APP_LIFF_ID;
      if (!liffId) {
        console.error("Missing REACT_APP_LIFF_ID for liff.init()");
        return;
      }

      try {
        await liff.init({ liffId });
      } catch (err) {
        console.error("liff.init failed:", err);
        return;
      }

      if (liff.isInClient() || liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        console.log("Got Line ID for binding:", profile.userId);
      }
    };

    initLiff();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // ส่งข้อมูล Login พร้อม LINE User ID (ถ้ามี)
      const payload = {
        ...formData,
        lineUserId: lineUserId // ส่งไปด้วยเพื่อทำการผูกบัญชี
      };

      const response = await axios.post("YOUR_API_URL/login", payload);
      
      if (response.data.success) {
        alert("เข้าสู่ระบบและผูกบัญชี LINE เรียบร้อยแล้ว!");
        
        // ไปหน้า Person
        navigate("/person", {
          state: { 
            labresult: response.data.labs[0], 
            allresult: response.data.labs 
          },
        });
      }
    } catch (error) {
      alert("รหัสผ่านไม่ถูกต้อง หรือ ไม่พบข้อมูล");
    }
  };

  return (
    <div className="container">
      <h2>เชื่อมต่อบัญชี</h2>
      <p style={{fontSize: '12px', color: 'gray'}}>
        กรุณากรอกเลข 13 หลักและรหัสผ่าน<br/>เพื่อผูกกับ LINE ของคุณ (ทำครั้งเดียว)
      </p>
      
      <form className="form" onSubmit={handleSubmit}>
        {/* ... inputs เดิม ... */}
        <label>เลขบัตรประชาชน:</label>
        <input type="text" name="idNumber" onChange={handleChange} required />

        <label>รหัสผ่าน:</label>
        <input type="password" name="password" onChange={handleChange} required />

        <button type="submit">ยืนยันตัวตน</button>
      </form>
    </div>
  );
};

export default Login;
