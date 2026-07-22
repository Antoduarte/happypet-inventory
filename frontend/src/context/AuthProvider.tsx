import React, { useState, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { authService } from '../services/auth';
import { cashSessionService } from '../services/cash';
import { TokenService } from '../services/token';
import type { AuthUser, CashSessionStatus } from '../interfaces/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
        Boolean(TokenService.getAccessToken()),
    );
    const [user, setUser] = useState<AuthUser | null>(() => {
        if (!TokenService.getAccessToken()) {
            return null;
        }

        const storedUser = localStorage.getItem('auth_user');
        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser) as AuthUser;
        } catch {
            return null;
        }
    });
    const [cashSessionId, setCashSessionId] = useState<number | null>(() => {
        const stored = localStorage.getItem('cash_session_id');
        return stored ? parseInt(stored, 10) : null;
    });
    const [cashSessionStatus, setCashSessionStatus] = useState<CashSessionStatus | null>(() => {
        const stored = localStorage.getItem('cash_session_status');
        return (stored as CashSessionStatus) || null;
    });
    const [managerCode, setManagerCode] = useState<string | null>(() => {
        if (!TokenService.getAccessToken()) {
            return null;
        }
        return localStorage.getItem('manager_auth_code') || null;
    });

    const isLoading = false;

    const login = useCallback(async (email: string, password: string) => {
        const { role, user_id, name } = await authService.login(email, password);
        const sessionData = await cashSessionService.getActiveSession();
        const cashSessionIdVal = sessionData?.id ?? null;
        const cashSessionStatusVal = sessionData?.status ?? null;

        localStorage.setItem('cash_session_id', String(cashSessionIdVal ?? ''));
        localStorage.setItem('cash_session_status', cashSessionStatusVal ?? '');

        // Un login nuevo debe volver a autorizar; no heredar el código de otro usuario/sesión.
        localStorage.removeItem('manager_auth_code');
        setManagerCode(null);

        const loggedUser: AuthUser = {
            id: user_id,
            role,
            name,
            hasCashSession: !!cashSessionIdVal,
            cashSessionId: cashSessionIdVal,
            cashSessionStatus: cashSessionStatusVal,
        };

        localStorage.setItem('auth_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        setCashSessionId(cashSessionIdVal);
        setCashSessionStatus(cashSessionStatusVal);
        setIsAuthenticated(true);
    }, []);

    const clearState = useCallback(() => {
        setIsAuthenticated(false);
        setUser(null);
        setCashSessionId(null);
        setCashSessionStatus(null);
        setManagerCode(null);
    }, []);

    const logout = useCallback(() => {
        authService.logout();
        localStorage.removeItem('cash_session_id');
        localStorage.removeItem('cash_session_status');
        localStorage.removeItem('manager_auth_code');
        clearState();
    }, [clearState]);

    const setManagerAuthorization = useCallback((code: string) => {
        setManagerCode(code);
        localStorage.setItem('manager_auth_code', code);
    }, []);

    const updateCashSession = useCallback(
        (id: number | null, status: CashSessionStatus | null) => {
            setCashSessionId(id);
            setCashSessionStatus(status);
            localStorage.setItem('cash_session_id', String(id ?? ''));
            localStorage.setItem('cash_session_status', status ?? '');
            if (user) {
                const updatedUser = {
                    ...user,
                    cashSessionId: id,
                    cashSessionStatus: status,
                    hasCashSession: !!id,
                };
                setUser(updatedUser);
                localStorage.setItem('auth_user', JSON.stringify(updatedUser));
            }
        },
        [user],
    );

    const value = useMemo(
        () => ({
            isAuthenticated,
            isLoading,
            login,
            logout,
            user,
            cashSessionId,
            cashSessionStatus,
            updateCashSession,
            managerCode,
            setManagerAuthorization,
        }),
        [
            isAuthenticated,
            isLoading,
            login,
            logout,
            user,
            cashSessionId,
            cashSessionStatus,
            updateCashSession,
            managerCode,
            setManagerAuthorization,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
