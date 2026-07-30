import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { authService } from '../services/auth';
import { cashSessionService } from '../services/cash';
import { TokenService } from '../services/token';
import { AuthStorageService } from '../services/authStorage';
import type { AuthUser, CashSessionStatus } from '../interfaces/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
        Boolean(TokenService.getAccessToken()),
    );
    const [user, setUser] = useState<AuthUser | null>(() => {
        if (!TokenService.getAccessToken()) {
            return null;
        }

        return AuthStorageService.getAuthUser();
    });
    const [cashSessionId, setCashSessionId] = useState<number | null>(() =>
        AuthStorageService.getCashSessionId(),
    );
    const [cashSessionStatus, setCashSessionStatus] = useState<CashSessionStatus | null>(() =>
        AuthStorageService.getCashSessionStatus(),
    );
    const [managerCode, setManagerCode] = useState<string | null>(() => {
        if (!TokenService.getAccessToken()) {
            return null;
        }
        return AuthStorageService.getManagerCode();
    });

    useEffect(() => {
        if (!isAuthenticated) return;
        cashSessionService.getActiveSession().then((data) => {
            const id = data?.id ?? null;
            const status = data?.status ?? null;

            if (id === cashSessionId && status === cashSessionStatus) return;

            setCashSessionId(id);
            setCashSessionStatus(status);
            AuthStorageService.setCashSessionId(id);
            AuthStorageService.setCashSessionStatus(status);
            if (user) {
                const updatedUser = {
                    ...user,
                    cashSessionId: id,
                    cashSessionStatus: status,
                    hasCashSession: !!id,
                };
                setUser(updatedUser);
                AuthStorageService.setAuthUser(updatedUser);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isLoading = false;

    const login = useCallback(async (email: string, password: string) => {
        const { role, user_id, name, email: userEmail } = await authService.login(email, password);
        const sessionData = await cashSessionService.getActiveSession();
        const cashSessionIdVal = sessionData?.id ?? null;
        const cashSessionStatusVal = sessionData?.status ?? null;

        AuthStorageService.setCashSessionId(cashSessionIdVal);
        AuthStorageService.setCashSessionStatus(cashSessionStatusVal);

        AuthStorageService.removeManagerCode();
        setManagerCode(null);

        const loggedUser: AuthUser = {
            id: user_id,
            role,
            name,
            email: userEmail,
            hasCashSession: !!cashSessionIdVal,
            cashSessionId: cashSessionIdVal,
            cashSessionStatus: cashSessionStatusVal,
        };

        AuthStorageService.setAuthUser(loggedUser);
        setUser(loggedUser);
        setCashSessionId(cashSessionIdVal);
        setCashSessionStatus(cashSessionStatusVal);
        setIsAuthenticated(true);

        return { cashSessionId: cashSessionIdVal, cashSessionStatus: cashSessionStatusVal };
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
        AuthStorageService.clearSessionData();
        clearState();
    }, [clearState]);

    const setManagerAuthorization = useCallback((code: string) => {
        setManagerCode(code);
        AuthStorageService.setManagerCode(code);
    }, []);

    const updateCashSession = useCallback(
        (id: number | null, status: CashSessionStatus | null) => {
            setCashSessionId(id);
            setCashSessionStatus(status);
            AuthStorageService.setCashSessionId(id);
            AuthStorageService.setCashSessionStatus(status);
            if (user) {
                const updatedUser = {
                    ...user,
                    cashSessionId: id,
                    cashSessionStatus: status,
                    hasCashSession: !!id,
                };
                setUser(updatedUser);
                AuthStorageService.setAuthUser(updatedUser);
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
