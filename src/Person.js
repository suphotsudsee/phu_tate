import React, { useEffect, useState } from "react";
import "./Mycss.css";
import { useLocation } from "react-router-dom";
import BarChart from "./BarChart";

function Person() {
  const { state } = useLocation();
 // console.log("======>", state.allresult);

// กรองข้อมูล
const filteredData = state.allresult.map((item) => ({
  date: new Date(
    new Date(item.DATE_SERV).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  )
    .toISOString()
    .split("T")[0], // แปลงเป็น YYYY-MM-DD และเปลี่ยนโซนเป็น Asia/Bangkok
  labResult: parseFloat(item.LABRESULT),
  hospname: item.hospname,
}))
.sort((a, b) => new Date(a.date) - new Date(b.date)) // เรียงลำดับวันที่
.slice(-10); // จำกัดข้อมูลให้เหลือแค่ 10 รายการสุดท้าย

console.log("======>", filteredData[9]);

  const d = new Date(filteredData[9].date);
  //const dd = moment(d).locale('th').format('D MMMM yyyy');
  const dresult = d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  //console.log("ssss====>",dresult);

  return (
<>
    <div class="container">
      <div class="header-text">{filteredData[9].labResult}</div>
      <div >วันที่ตรวจ : {dresult}</div>
      <div >{filteredData[9].hospname}</div>
      <div class="main-title">น้ำตาลในเลือด</div>

      <div class="result-number">70-100</div>
      <div class="description">mg/dL</div>

      <div class="alert-section">
        <div class="alert-text text-center">
          <p>&lt; 70 น้ำตาลต่ำ ระวัง !! วูบ</p>
          <p>&gt; 100 น้ำตาลสูงเกินแล้ว ต้องเริ่มคุมอาหาร</p>
          <p>&gt; 126 เสี่ยงเป็นเบาหวานแล้วนะ</p>
        </div>
      </div>

      <div class="suggestions">
        <h5 class="text-center">น้ำตาลสูงทำไงดี ?</h5>
        <div class="suggestion-item">
          <span class="icon">💖</span> ลดแป้ง น้ำตาล ของหวาน น้ำอัดลม น้ำหวาน
        </div>
        <div class="suggestion-item">
          <span class="icon">💖</span> ทานมื้อเย็นให้เสร็จซักก่อน 6 โมง
        </div>
        <div class="suggestion-item">
          <span class="icon">💖</span> ลดการดื่มแอลกอฮอล์ สูบบุหรี่
        </div>
        <div class="suggestion-item">
          <span class="icon">💖</span> ออกกำลังกายสม่ำเสมอ / พักผ่อนให้เพียงพอ
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
