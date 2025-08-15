import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Person from "./Person";
import Login from "./Login";
import BarChart from "./BarChart";
import "./App.css";

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Routes>
        {/* ✅ React Router v6+ ไม่ต้องใช้ exact */}
        <Route path="/" element={<Register />} />
        <Route path="person" element={<Person />} />
        <Route path="barchart" element={<BarChart />} />
        <Route path="login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
