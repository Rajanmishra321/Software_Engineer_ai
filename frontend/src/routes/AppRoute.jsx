import React from 'react'
import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom'
import Login from '../screen/Login'
import Register from '../screen/Register'
import Home from '../screen/Home'
import Project from '../screen/Project'
import UserAuth from '../auth/UserAuth'

const AppRoutes = () => {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<UserAuth><Home /></UserAuth>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/project/:projectId" element={<UserAuth><Project /></UserAuth>} />
                {/* Old links without an id can't identify a project. */}
                <Route path="/project" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

        </BrowserRouter>
    )
}

export default AppRoutes