import React, { useEffect, useState } from "react";
import "./Mycss.css";
import { useLocation } from "react-router-dom";
import BarChart from "./BarChart";

function Person() {
  const { state } = useLocation();

  // หากไม่มีข้อมูลให้แสดงข้อความแจ้งเตือน
  if (!state || !state.allresult || state.allresult.length === 0) {
    return <div>ไม่พบข้อมูลการตรวจ</div>;
  }

  // กรองและจัดรูปแบบข้อมูลให้อยู่ในรูปแบบที่ต้องการ
  const filteredData = state.allresult
    .map((item) => ({
      date: new Date(
        new Date(item.DATE_SERV).toLocaleString("en-US", {
          timeZone: "Asia/Bangkok",
        })
      )
        .toISOString()
        .split("T")[0], // แปลงเป็น YYYY-MM-DD และเปลี่ยนโซนเป็น Asia/Bangkok
      labResult: parseFloat(item.LABRESULT),
      hospname: item.hospname,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)) // เรียงลำดับวันที่
    .slice(-10); // จำกัดข้อมูลให้เหลือแค่ 10 รายการสุดท้าย

  // ใช้ข้อมูลรายการล่าสุดแทนการอ้างอิงตำแหน่งที่ 9 เพื่อป้องกันข้อมูลไม่ครบ 10 รายการ
  const latestData = filteredData[filteredData.length - 1];
  const d = new Date(latestData.date);
  const dresult = d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
    <div className="container">
      <div className="header-text">{latestData.labResult}</div>
      <div >วันที่ตรวจ : {dresult}</div>
      <div >{latestData.hospname}</div>
      <div className="main-title">น้ำตาลในเลือด</div>

      <div className="result-number">70-100</div>
      <div className="description">mg/dL</div>

      <div className="alert-section">
        <div className="alert-text text-center">
          <p>&lt; 70 น้ำตาลต่ำ ระวัง !! วูบ</p>
          <p>&gt; 100 น้ำตาลสูงเกินแล้ว ต้องเริ่มคุมอาหาร</p>
          <p>&gt; 126 เสี่ยงเป็นเบาหวานแล้วนะ</p>
        </div>
      </div>

      <div className="suggestions">
        <h5 className="text-center">น้ำตาลสูงทำไงดี ?</h5>
        <div className="suggestion-item">
          <span className="icon">💖</span> ลดแป้ง น้ำตาล ของหวาน น้ำอัดลม น้ำหวาน
        </div>
        <div className="suggestion-item">
          <span className="icon">💖</span> ทานมื้อเย็นให้เสร็จซักก่อน 6 โมง
        </div>
        <div className="suggestion-item">
          <span className="icon">💖</span> ลดการดื่มแอลกอฮอล์ สูบบุหรี่
        </div>
        <div className="suggestion-item">
          <span className="icon">💖</span> ออกกำลังกายสม่ำเสมอ / พักผ่อนให้เพียงพอ
        </div>
      </div>
    </div>
      <div>
        <h1>ผลตรวจ</h1>
        <BarChart data={filteredData}/>
      </div>
</>
  );
}

export default Person;
