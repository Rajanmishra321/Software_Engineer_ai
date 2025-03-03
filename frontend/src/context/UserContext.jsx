// import React, { createContext, use, useContext, useState } from 'react';

// // Create the UserContext
// export const UserContext = createContext();

// // Create the UserContextProvider component
// export const UserProvider = ({ children }) => {
//     // Define the state for the user
//     const [user, setUser] = useState(null);
//     // Define any other functions or state variables you need
//     // Provide the user state and any other functions/variables to the children components
//     return (
//         <UserContext.Provider value={{ user, setUser }}>
//             {children}
//         </UserContext.Provider>
//     );
// };


import React, { createContext, useState, useEffect } from 'react';
import axios from '../config/axios';

// Create the context
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing user when component mounts
    useEffect(() => {
        const token = localStorage.getItem('Token');
        if (token) {
            // Fetch user data if token exists
            axios.get('/users/profile')
                .then(response => {
                    setUser(response.data.user);
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    // This helps persist user state between component re-renders
    const updateUser = (userData) => {
        setUser(userData);
        setLoading(false);
    };

    // Clear user data on logout
    const logout = () => {
        localStorage.removeItem('Token');
        setUser(null);
    };

    // This value will be available to any component that uses this context
    const value = {
        user,
        setUser: updateUser,
        loading,
        logout
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};