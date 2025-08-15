import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./App.css";

const Login = () => {
  const [formData, setFormData] = useState({
    idNumber: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("/login", formData);
      const results = response?.data?.results;

      if (response?.data?.success && results && results.length > 0) {
        navigate("/person", {
          state: { labresult: results[0], allresult: results },
        });
      } else {
        const message = response?.data?.message || "ไม่พบข้อมูล";
        alert(message);
      }
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      alert(message);
    }
  };

  return (
    <div className="container">
      <h2 className="header">เข้าสู่ระบบ</h2>

      <form className="form" onSubmit={handleSubmit}>
        <label>เลขบัตรประชาชน:</label>
        <input
          type="text"
          name="idNumber"
          value={formData.idNumber}
          onChange={handleChange}
          required
        />

        <label>รหัสผ่าน: </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className="buttons">
          <button type="submit" className="submit-button">
            เข้าสู่ระบบ
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
