import { createContext } from 'react';
import type { AuthUser, CashSessionStatus } from '../interfaces/auth';

export interface AuthContextValue {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    user: AuthUser | null;
    cashSessionId: number | null;
    cashSessionStatus: CashSessionStatus | null;
    updateCashSession: (id: number | null, status: CashSessionStatus | null) => void;
    /** Código de autorización de manager/admin validado y cacheado para la sesión de login actual. */
    managerCode: string | null;
    /** Cachea el código de autorización validado para el resto de la sesión de login. */
    setManagerAuthorization: (code: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
