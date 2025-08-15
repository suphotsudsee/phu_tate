import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    phone: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "https://server-registration-app.phoubon.in.th/register",
        formData
      );
      alert(response?.data?.message);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message || "เกิดข้อผิดพลาดในการลงทะเบียน";
      alert(message);
    }
  };

  return (
    <div className="container">
      <h2 className="header">กรุณาลงทะเบียน</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>ชื่อ:</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />

        <label>นามสกุล:</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />

        <label>เลขประจำตัวประชาชน 13 หลัก: </label>
        <input
          type="text"
          name="idNumber"
          value={formData.idNumber}
          onChange={handleChange}
          required
        />

        <label>เบอร์โทรศัพท์:</label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
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
            ยืนยัน
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
