import React, { useEffect, useState } from "react";
import "./Mycss.css";
import { useLocation } from "react-router-dom";
import BarChart from "./BarChart";

function Person() {
  const { state } = useLocation();
  const [cvdRisk, setCvdRisk] = useState(null);

  useEffect(() => {
    if (!state || !state.allresult || state.allresult.length === 0) return;
    const fetchRisk = async () => {
      try {
        const cid = state.allresult[0]?.CID;
        if (!cid) return;
        const res = await fetch(`/cvdrisk/${cid}`);
        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
          setCvdRisk(data.results[0]);
        }
      } catch (err) {
        console.error("CVD RISK ERROR:", err);
      }
    };
    fetchRisk();
  }, [state]);

  // หากไม่มีข้อมูลให้แสดงข้อความแจ้งเตือน
  if (!state || !state.allresult || state.allresult.length === 0) {
    return <div>ไม่พบข้อมูลการตรวจ</div>;
  }

  // กรองและจัดรูปแบบข้อมูลให้อยู่ในรูปแบบที่ต้องการ
  const parseDate = (raw) => {
    if (!raw) return null;
    // รองรับรูปแบบ YYYY-MM-DD, Date object หรือ YYYYMMDD (ตัวเลข/สตริง 8 หลัก)
    if (raw instanceof Date) return raw;
    const str = String(raw).trim();
    if (str.length === 8 && /^\d{8}$/.test(str)) {
      const y = str.slice(0, 4);
      const m = str.slice(4, 6);
      const d = str.slice(6, 8);
      return new Date(`${y}-${m}-${d}`);
    }
    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const filteredData = state.allresult
    .map((item) => {
      const parsed = parseDate(item.DATE_SERV);
      if (!parsed) return null;
      const dateBangkok = new Date(
        parsed.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
      );
      if (Number.isNaN(dateBangkok.getTime())) return null;
      return {
        date: dateBangkok.toISOString().split("T")[0],
        labResult: parseFloat(item.LABRESULT),
        hospname: item.hospname,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date)) // เรียงลำดับวันที่
    .slice(-10); // จำกัดข้อมูลให้เหลือแค่ 10 รายการสุดท้าย

  // ใช้ข้อมูลรายการล่าสุดแทนการอ้างอิงตำแหน่งที่ 9 เพื่อป้องกันข้อมูลไม่ครบ 10 รายการ
  if (filteredData.length === 0) {
    return <div>ไม่พบข้อมูลการตรวจ</div>;
  }

  const latestData = filteredData[filteredData.length - 1];
  const riskDate = cvdRisk
    ? new Date(cvdRisk.REF_DATE).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const resultDate = latestData
    ? new Date(latestData.date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      <div className="container">
        <div className="header-text">
          {cvdRisk ? cvdRisk.Thai_ASCVD2_Risk_percent.toFixed(1) : "..."}
        </div>
        {riskDate && <div>วันที่ตรวจ : {riskDate}</div>}
        <div>{latestData.hospname}</div>
        <div className="main-title">ความเสี่ยงโรคหัวใจและหลอดเลือด (10 ปี)</div>

        <div className="result-number">
          {cvdRisk ? cvdRisk.Risk_Category_TH : ""}
        </div>
        <div className="description">% ความเสี่ยง</div>

        <div className="alert-section">
          <div className="alert-text text-center">
            <p>&lt; 10% ความเสี่ยงต่ำ</p>
            <p>10-20% ความเสี่ยงปานกลาง</p>
            <p>&gt; 20% ความเสี่ยงสูง</p>
          </div>
        </div>

        <div className="suggestions">
          <h5 className="text-center">ลดความเสี่ยงทำอย่างไร ?</h5>
          <div className="suggestion-item">
            <span className="icon">💖</span> ควบคุมอาหารและออกกำลังกาย
          </div>
          <div className="suggestion-item">
            <span className="icon">💖</span> เลิกสูบบุหรี่
          </div>
          <div className="suggestion-item">
            <span className="icon">💖</span> ตรวจสุขภาพประจำปี
          </div>
          <div className="suggestion-item">
            <span className="icon">💖</span> พักผ่อนให้เพียงพอ
          </div>
        </div>
      </div>
      
      <div className="header-text">{latestData.labResult}</div>
        {resultDate && <div>วันที่ตรวจ : {resultDate}</div>}
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
  
      <div>
        <h1>ผลตรวจน้ำตาลในเลือด</h1>
        <BarChart data={filteredData} />
      </div>
    </>
  );
}

export default Person;
