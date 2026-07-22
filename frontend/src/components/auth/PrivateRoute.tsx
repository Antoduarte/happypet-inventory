import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * PrivateRoute
 *
 * Wraps protected areas of the app. If the user is not authenticated it
 * redirects to /login while saving the attempted path so we can redirect
 * back after a successful login.
 *
 * Usage – wrap any Route group in AppRoutes:
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/" element={<DashboardLayout />}>
 *       ...protected routes...
 *     </Route>
 *   </Route>
 */
export const PrivateRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // While we verify the stored token, render nothing (avoids flash of login page)
    if (isLoading) {
        return null;
    }

    if (!isAuthenticated) {
        // Pass the current location so Login can redirect back after success
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render the child routes
    return <Outlet />;
};
