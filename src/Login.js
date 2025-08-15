import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./App.css";

const Login = () => {
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(
        "https://server-registration-app.phoubon.in.th/login",
        { idNumber, password }
      );
      const results = response?.data?.results;
      if (results && results.length > 0) {
        navigate("/person", {
          state: { labresult: results[0], allresult: results },
        });
      } else {
        setError("ไม่พบข้อมูล");
      }
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message ||
        "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์";
      setError(message);
    }
  };

  return (
    <div className="container">
      <h2 className="header">เข้าสู่ระบบ</h2>

      <form className="form" onSubmit={handleSubmit}>
        <label>เลขบัตรประชาชน:</label>
        <input
          type="text"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          required
        />

        <br />
        <label>รหัสผ่าน: </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <br />
        <div className="buttons">
          <button type="submit" className="submit-button">
            เข้าสู่ระบบ
          </button>
        </div>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Login;
