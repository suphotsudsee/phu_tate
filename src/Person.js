import React, { useEffect, useState } from "react";
import "./Mycss.css";
import { useLocation } from "react-router-dom";
import BarChart from "./BarChart";

function Person() {
  const { state } = useLocation();
  const [cvdRisk, setCvdRisk] = useState(null);

  // Debug: ดูข้อมูลที่ส่งเข้ามาจาก Login
  console.log("State from Login:", state);

  const cid =
    state?.allresult?.find((item) => item?.CID)?.CID ||
    state?.user?.idNumber ||
    null;

  useEffect(() => {
    if (!cid) return;
    const fetchRisk = async () => {
      try {
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
  }, [cid]);

  // หากไม่มีข้อมูลให้แสดงข้อความแจ้งเตือน
  if (!state || !state.allresult || state.allresult.length === 0) {
    return <div className="container" style={{textAlign:'center', marginTop:20}}>ไม่พบข้อมูลการตรวจ (No Data in State)</div>;
  }

  // ฟังก์ชันแปลงวันที่ (ปรับให้ยืดหยุ่นขึ้น)
  const parseDate = (raw) => {
    if (!raw) return null;
    try {
        // กรณีเป็น Date object อยู่แล้ว
        if (raw instanceof Date) return raw;
        
        const str = String(raw).trim();
        // กรณี YYYYMMDD
        if (str.length === 8 && /^\d{8}$/.test(str)) {
          const y = str.slice(0, 4);
          const m = str.slice(4, 6);
          const d = str.slice(6, 8);
          return new Date(`${y}-${m}-${d}`);
        }
        // กรณีอื่นๆ ให้ลองใช้ Date constructor
        const parsed = new Date(str);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch (e) {
        console.error("Date parse error:", raw, e);
        return null;
    }
  };

  // เลือกแสดงชื่อแล็บ (TH > EN > code)
  const formatLabTestName = (row) =>
    row?.LABTEST_NAME || row?.LABTEST_TH || row?.LABTEST_EN || row?.LABTEST || "-";

  // ชื่อแล็บภาษาไทย (ถ้าไม่มีใช้ชื่อรวม/รหัสแทน)
  const formatLabTestThai = (row) =>
    row?.LABTEST_TH || row?.LABTEST_NAME || row?.LABTEST || "-";

  const filteredData = state.allresult
    .map((item) => {
      const parsed = parseDate(item.DATE_SERV);
      
      // ถ้าวันที่แปลงไม่ได้ ให้ข้ามไป (หรือคุณอาจจะเลือก return เป็นวันที่ปัจจุบันหลอกๆ เพื่อเทสก็ได้)
      if (!parsed) return null; 

      const dateBangkok = new Date(
        parsed.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
      );

      return {
        date: parsed.toISOString().split("T")[0], // ใช้วันที่ที่ parse ได้โดยตรงเพื่อความชัวร์
        labResult: parseFloat(item.LABRESULT) || 0, // กัน NaN
        // ใช้ชื่อโรงพยาบาล ถ้ามี จาก backend (HOSPNAME) ถ้าไม่มีก็ fallback LABPLACE/HOSPCODE
        hospname: item.HOSPNAME || item.hospname || item.LABPLACE || item.HOSPCODE || "ไม่ระบุสถานพยาบาล",
        originalItem: item // เก็บตัวเดิมไว้เผื่อใช้ในตาราง
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10);

  // Debug: ดูข้อมูลหลังกรองแล้ว
  console.log("Filtered Data:", filteredData);

  if (filteredData.length === 0) {
    return (
        <div className="container" style={{textAlign:'center', marginTop:20}}>
            <h3>ไม่พบข้อมูลการตรวจที่สมบูรณ์</h3>
            <p>อาจเกิดจากรูปแบบวันที่ไม่ถูกต้อง หรือไม่มีผลแล็บ</p>
            <p>Raw Data Count: {state.allresult.length}</p>
        </div>
    );
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
        {riskDate && <div>วันที่ตรวจความเสี่ยง : {riskDate}</div>}
        <div>{latestData.hospname}</div>
        <div className="main-title">ความเสี่ยงโรคหัวใจและหลอดเลือด (10 ปี)</div>

        <div className="result-number">
          {cvdRisk ? cvdRisk.Risk_Category_TH : "-"}
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
          {/* ... ส่วน suggestion เดิม ... */}
        </div>
      </div>
      
      {/* ส่วนแสดงผลแล็บ */}
      <div className="container" style={{marginTop: '20px'}}>
        <div className="header-text">{latestData.labResult}</div>
        {resultDate && <div>วันที่ตรวจ : {resultDate}</div>}
        <div>{latestData.hospname}</div>
        <div className="main-title">น้ำตาลในเลือด</div>

        <div className="result-number">70-100</div>
        <div className="description">mg/dL</div>

        <div className="alert-section">
           {/* ... ส่วน alert text เดิม ... */}
           <div className="alert-text text-center">
            <p>&lt; 70 น้ำตาลต่ำ ระวัง !! วูบ</p>
            <p>&gt; 100 น้ำตาลสูงเกินแล้ว</p>
          </div>
        </div>

         {/* ... ส่วน suggestion เดิม ... */}
      </div>
  
      <div style={{padding: '20px'}}>
        <h1>ผลตรวจน้ำตาลในเลือด</h1>
        <BarChart data={filteredData} />
      </div>

      <div style={{ marginTop: 20, padding: '20px' }}>
        <h3>ตารางผลแล็บ (ทั้งหมด {state.allresult.length} รายการ)</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{background: '#f0f0f0'}}>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>วันที่</th>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>สถานพยาบาล</th>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>รายการ</th>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>ชื่อแล็บ (ไทย)</th>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>ผล</th>
              </tr>
            </thead>
            <tbody>
              {state.allresult.map((row, idx) => (
                <tr key={`${row.CID}-${idx}`}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>
                    {row.DATE_SERV || "-"}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>
                    {row.HOSPNAME || row.LABPLACE || row.HOSPCODE || "-"}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.LABTEST}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{formatLabTestThai(row)}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{row.LABRESULT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Person;
