import React from "react";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import Login from "../screen/Login";
import Register from "../screen/Register";
import Home from "../screen/Home";
import { Project } from "../screen/Project";

const AppRoute = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home></Home>} />
        <Route path="/login" element={<Login></Login>} />
        <Route path="/register" element={<Register></Register>} />
        <Route path="/project" element={<Project></Project>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoute;
