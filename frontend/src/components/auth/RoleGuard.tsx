import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/interfaces/auth';

interface RoleGuardProps {
    roles: UserRole[];
    children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ roles, children }) => {
    const { user } = useAuth();
    const role = user?.role ?? null;

    if (role && roles.includes(role)) {
        return <>{children}</>;
    }

    return <Navigate to="/" replace />;
};
