import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

function readStoredAuth() {
    try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
    }
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredAuth);
    const loading = false;

    const login = useCallback((userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, login, logout, loading }),
        [user, login, logout, loading]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
