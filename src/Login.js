import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import liff from "@line/liff";

const LIFF_ID = process.env.REACT_APP_LIFF_ID || "2008799540-to0v6frF";

const Login = ({ onLogin }) => {
  const log = (...args) => console.log("[Login]", ...args);
  const [idNumber, setIdNumber] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [lineProfile, setLineProfile] = useState(null);
  const [isLineClient, setIsLineClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoTried, setAutoTried] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initLiff = async () => {
      log("Initializing LIFF", { LIFF_ID });
      if (!LIFF_ID) {
        console.error("Missing LIFF ID");
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });
        log("liff.init succeeded");
      } catch (err) {
        console.error("liff.init failed:", err);
        // ถ้าเจอ invalid authorization code ให้เคลียร์ session แล้ว login ใหม่
        if (
          err &&
          typeof err.message === "string" &&
          err.message.toLowerCase().includes("authorization code")
        ) {
          try {
            liff.logout();
          } catch (e) {
            console.warn("liff.logout failed", e);
          }
          liff.login({ redirectUri: window.location.href });
          return;
        }
        setIsLoading(false);
        return;
      }

      if (!liff.isLoggedIn()) {
        log("Not logged in, redirecting to liff.login()");
        liff.login();
        return;
      }

      try {
        const profile = await liff.getProfile();
        log("Profile fetched", profile);
        setLineUserId(profile.userId);
        setLineProfile(profile);
        setIsLineClient(true);
        setIsLoading(false);
        if (!autoTried) {
          setAutoTried(true);
          autoLoginWithLine(profile.userId, profile.displayName);
        }
      } catch (err) {
        console.error("getProfile failed:", err);
        setIsLoading(false);
      }
    };

    initLiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoLoginWithLine = async (userId, displayName) => {
    log("autoLoginWithLine called", { userId, displayName });
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axios.post("/line-auto-login", {
        lineUserId: userId,
        lineDisplayName: displayName,
      });
      log("LINE auto login response", res.data);
      if (res.data.success) {
        if (onLogin) onLogin();
        navigate("/home", {
          state: {
            labresult: res.data.labs?.[0],
            allresult: res.data.labs,
          },
        });
      } else {
        alert("ยังไม่ได้ผูกบัญชี LINE กับระบบ");
      }
    } catch (err) {
      const errInfo = {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
      };
      console.error("LINE auto login failed:", errInfo);
      alert(`ไม่สามารถเข้าสู่ระบบผ่าน LINE ได้ (status: ${errInfo.status || "unknown"})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    log("Handle submit fired", { idNumber, lineUserId });

    if (!lineUserId) {
      // พยายามให้ล็อกอิน LINE อีกครั้งเพื่อดึง userId
      try {
        liff.login();
      } catch (err) {
        console.error("Cannot trigger liff.login()", err);
      }
      return;
    }

    try {
      setLoading(true);
      const payload = {
        idNumber,
        lineUserId, // ส่งไปด้วยเพื่อทำการผูกบัญชี
        lineDisplayName: lineProfile?.displayName,
      };

      log("Submitting login payload", payload);
      const response = await axios.post("/login", payload);
      log("Login response", response.data);

      if (response.data.success) {
        if (onLogin) onLogin();
        navigate("/home", {
          state: {
            labresult: response.data.labs?.[0],
            allresult: response.data.labs,
          },
        });
      } else {
        alert("ไม่พบข้อมูล");
      }
    } catch (error) {
      console.error("Manual login failed:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      alert("ไม่พบข้อมูลหรือเกิดข้อผิดพลาด (ดู console สำหรับรายละเอียด)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>เชื่อมต่อบัญชี</h2>
      <p style={{ fontSize: "12px", color: "gray" }}>
        กรุณากรอกเลข 13 หลักเพื่อผูกกับ LINE ของคุณ (ทำครั้งเดียว)
      </p>

      {isLoading ? (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p>กำลังเชื่อมต่อข้อมูล LINE...</p>
        </div>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          {isLineClient && lineProfile && (
            <div style={{ marginBottom: 10 }}>
              <strong>LINE:</strong> {lineProfile.displayName}
            </div>
          )}
          <label>เลขบัตรประชาชน:</label>
          <input
            type="text"
            name="idNumber"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "ยืนยันตัวตน"}
          </button>
        </form>
      )}
    </div>
  );
};

export default Login;
