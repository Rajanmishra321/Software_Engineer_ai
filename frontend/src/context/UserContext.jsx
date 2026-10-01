import { createContext, useCallback, useEffect, useState } from 'react';
import axios from '../config/axios';
import { clearToken, getToken } from '../utils/token';

// Create the context
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // True when the session couldn't be checked because the server was
    // unreachable - as opposed to the session actually being invalid.
    const [isServerUnreachable, setIsServerUnreachable] = useState(false);

    // The single place the stored token is exchanged for the current user,
    // so a page load makes one profile request instead of several.
    const loadProfile = useCallback(async () => {
        if (!getToken()) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setIsServerUnreachable(false);

        try {
            const { data } = await axios.get('/users/profile');
            setUser(data.user);
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                // The server rejected the token: the session really is over.
                clearToken();
                setUser(null);
            } else {
                // Server down, restarting or a network blip. Keep the token
                // so a refresh doesn't throw the user out of their session.
                console.error('Could not verify session:', error);
                setIsServerUnreachable(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // This helps persist user state between component re-renders
    const updateUser = useCallback((userData) => {
        setUser(userData);
        setIsServerUnreachable(false);
        setLoading(false);
    }, []);

    // Clear user data on logout
    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    // This value will be available to any component that uses this context
    const value = {
        user,
        setUser: updateUser,
        loading,
        isServerUnreachable,
        retry: loadProfile,
        logout
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
