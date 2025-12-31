import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import liff from "@line/liff";

const LIFF_ID = process.env.REACT_APP_LIFF_ID || "2008799540-to0v6frF";

const Login = ({ onLogin }) => {
  const [idNumber, setIdNumber] = useState("");
  const [lineProfile, setLineProfile] = useState(null);
  const [loading, setLoading] = useState(false); // ใช้ตอนกด Submit
  const [initializing, setInitializing] = useState(true); // ใช้ตอนโหลด LIFF ครั้งแรก
  const navigate = useNavigate();

  // ปรับเป็น useCallback เพื่อความเสถียร
  const autoLoginWithLine = useCallback(async (userId, displayName) => {
    try {
      const res = await axios.post("/line-auto-login", {
        lineUserId: userId,
        lineDisplayName: displayName,
      });

      if (res.data.success) {
        if (onLogin) onLogin();
        navigate("/home", {
          state: {
            labresult: res.data.labs?.[0],
            allresult: res.data.labs,
          },
        });
      }
    } catch (err) {
      console.log("Not linked yet or auto-login failed");
      // ไม่ต้อง alert ที่นี่ เพราะถ้า auto-login ไม่ติด 
      // ผู้ใช้ต้องกรอกเลขบัตรเองอยู่แล้ว
    }
  }, [navigate, onLogin]);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });
        
        if (!liff.isLoggedIn()) {
          // ใช้ redirectUri เพื่อให้กลับมาที่เดิมแม่นยำขึ้น
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const profile = await liff.getProfile();
        setLineProfile(profile);
        
        // ลอง Auto Login ทันทีที่ได้ Profile
        await autoLoginWithLine(profile.userId, profile.displayName);
        
      } catch (err) {
        const msg = (err && err.message) ? err.message.toLowerCase() : "";
        console.error("LIFF Initialization failed", err);
        if (msg.includes("code_verifier") || msg.includes("authorization code")) {
          try {
            console.warn("Resetting LIFF session due to PKCE/auth error");
            liff.logout();
          } catch (e) {
            console.warn("liff.logout failed", e);
          }
          // บังคับ login ใหม่เพื่อรีเฟรช session
          liff.login({ redirectUri: window.location.href });
          return;
        }
      } finally {
        setInitializing(false);
      }
    };

    initLiff();
  }, [autoLoginWithLine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lineProfile?.userId) {
      alert("ไม่พบข้อมูล LINE กรุณารีเฟรชหน้าจอ");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        idNumber,
        lineUserId: lineProfile.userId,
        lineDisplayName: lineProfile.displayName,
      };

      const response = await axios.post("/login", payload);

      if (response.data.success) {
        if (onLogin) onLogin();
        navigate("/home", {
          state: {
            labresult: response.data.labs?.[0],
            allresult: response.data.labs,
          },
        });
      } else {
        alert("ไม่พบข้อมูล หรือเลขบัตรไม่ถูกต้อง");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "50px" }}>
        <p>กำลังเตรียมข้อมูล LINE...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>เชื่อมต่อบัญชี</h2>
      <p style={{ fontSize: "14px", color: "#666" }}>
        กรุณากรอกเลขบัตรประชาชน 13 หลัก เพื่อผูกกับ LINE ของคุณ
      </p>

      <form className="form" onSubmit={handleSubmit}>
        {lineProfile && (
          <div className="profile-info" style={{ marginBottom: 15, padding: 10, background: "#f9f9f9" }}>
            <p><strong>ผู้ใช้งาน:</strong> {lineProfile.displayName}</p>
          </div>
        )}
        
        <div className="input-group">
          <label>เลขบัตรประชาชน:</label>
          <input
            type="text"
            pattern="\d*" 
            maxLength="13"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="ระบุตัวเลข 13 หลัก"
            required
          />
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? "กำลังบันทึก..." : "ยืนยันตัวตน"}
        </button>
      </form>
    </div>
  );
};

export default Login;
