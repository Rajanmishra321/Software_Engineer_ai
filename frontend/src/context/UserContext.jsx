import React, { createContext, use, useContext, useState } from 'react';

// Create the UserContext
export const UserContext = createContext();

// Create the UserContextProvider component
export const UserProvider = ({ children }) => {
    // Define the state for the user
    const [user, setUser] = useState(null);
    // Define any other functions or state variables you need
    // Provide the user state and any other functions/variables to the children components
    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

