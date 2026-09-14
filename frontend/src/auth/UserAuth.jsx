// import React, { useContext, useEffect, useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { UserContext } from '../context/UserContext'

// const UserAuth = ({ children }) => {

//     const { user } = useContext(UserContext)
//     const [ loading, setLoading ] = useState(true)
//     const token = localStorage.getItem('Token')
//     const navigate = useNavigate()




//     useEffect(() => {
//         if (user) {
//             setLoading(false)
//         }

//         if (!token) {
//             navigate('/login')
//         }

//         if (!user) {
//             navigate('/login')
//         }

//     }, [])

//     if (loading) {
//         return <div>Loading...</div>
//     }


//     return (
//         <>
//             {children}</>
//     )
// }

// export default UserAuth


import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import axios from '../config/axios';
import Spinner from '../components/ui/Spinner';

const UserAuth = ({ children }) => {
    const { user, setUser, loading: contextLoading } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('Token');
        
        // If no token, redirect to login
        if (!token) {
            navigate('/login');
            return;
        }
        
        // If we have user data already, we can continue
        if (user) {
            setLoading(false);
            return;
        }
        
        // If we have a token but no user (e.g., after page refresh)
        if (!user && token) {
            // Make API call to get user data
            axios.get('/users/profile')
                .then(response => {
                    setUser(response.data.user);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Failed to fetch user data:', error);
                    localStorage.removeItem('Token');
                    navigate('/login');
                });
        }
    }, [navigate, setUser, user]);

    // Show loading state if either context is loading or this component is loading
    if (contextLoading || loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Spinner size={48} className="text-indigo-500" />
            </div>
        );
    }

    return <>{children}</>;
};

export default UserAuth;