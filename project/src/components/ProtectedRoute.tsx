import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (!token || !storedUser) {
                setIsAuthenticated(false);
                setIsVerifying(false);
                return;
            }

            try {
                const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:3001';
                const response = await fetch(`${API_BASE}/api/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    setIsAuthenticated(true);
                } else {
                    // Token is invalid/expired according to server
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('temp_user_id');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                // On network error, maybe allow if token exists but warn? 
                // For strict security, we deny.
                setIsAuthenticated(false);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyToken();
    }, []);

    if (isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-cyan-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 font-medium animate-pulse">Verifying Session...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
