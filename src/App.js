import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Person from "./Person";
import Login from "./Login";
import BarChart from "./BarChart";
import "./App.css";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Register />} />
        <Route exact path="person" element={<Person />} />
        <Route exact path="barchart" element={<BarChart />} />
        <Route exact path="login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
