import React from "react";
import { useLocation } from "react-router-dom";
export const Project = () => {
    const location = useLocation();
    console.log(location.state);
    return (
        <div>
            <h1>Project</h1>
        </div>
    );
};