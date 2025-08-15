import React from "react";
import { Bar } from "react-chartjs-2";
// Import Chart.js plugin for custom labels
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register components and plugins
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);


const BarChart = ({ data }) => {

//console.log("data===>",data);

  const chartData = {
    labels: data.map((item) => item.date), // ดึงวันที่
    datasets: [
      {
        label: "ผลตรวจ",
        data: data.map((item) => item.labResult), // ดึงผลตรวจ
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    //responsive: true,
    //responsive: false,
    maintainAspectRatio: false, // ปิดการรักษาสัดส่วนอัตโนมัติ
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: false,
        text: "Lab Results Over Time",
      },
      datalabels: {
        anchor: "end", // ตำแหน่งข้อความด้านบนแท่ง
        align: "end",
        color: "blue", // เปลี่ยนสีตัวเลขเป็นสีน้ำเงิน
        font: {
          size: 14, // ขนาดตัวอักษร
          weight: "bold",
        },
        rotation: -90, // หมุนตัวอักษร 90 องศา
        formatter: (value) => value.toFixed(2), // แสดงตัวเลขทศนิยม 2 ตำแหน่ง (ถ้าจำเป็น)
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        beginAtZero: true,
        stacked: true,
        //max: 400, // กำหนดค่า Max ที่เพิ่มขึ้น 100%
        ticks: {
          stepSize: 50, // กำหนดระยะห่างของค่าบนแกน Y
        },
        title: {
          display: true,
          text: "Lab Result",
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChart;
