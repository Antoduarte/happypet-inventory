import { useAuth } from './useAuth';
import type { UserRole } from '../interfaces/auth';

export const usePermission = () => {
    const { user } = useAuth();
    const role = user?.role ?? null;
    const userId = user?.id ?? null;

    return {
        role,
        userId,
        isAdmin: role === 'admin',
        isManager: role === 'manager',
        isCashier: role === 'cashier',
        canAccessUsers: role === 'admin',
        canManageProducts: role === 'admin' || role === 'manager',
        canDeleteProducts: role === 'admin',
        canCloseAnySession: role === 'admin' || role === 'manager',
        isOwnerOfSession: (sessionUserId: number) => sessionUserId === userId,
        hasRole: (allowedRoles: UserRole[]) => (role ? allowedRoles.includes(role) : false),
    };
};
