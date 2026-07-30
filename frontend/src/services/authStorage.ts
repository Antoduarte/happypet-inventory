import type { AuthUser, CashSessionStatus } from '../interfaces/auth';

export class AuthStorageService {
    private static readonly AUTH_USER_KEY = 'auth_user';
    private static readonly CASH_SESSION_ID_KEY = 'cash_session_id';
    private static readonly CASH_SESSION_STATUS_KEY = 'cash_session_status';
    private static readonly MANAGER_AUTH_CODE_KEY = 'manager_auth_code';

    static getAuthUser(): AuthUser | null {
        const stored = localStorage.getItem(this.AUTH_USER_KEY);
        if (!stored) return null;
        try {
            return JSON.parse(stored) as AuthUser;
        } catch {
            return null;
        }
    }

    static setAuthUser(user: AuthUser): void {
        localStorage.setItem(this.AUTH_USER_KEY, JSON.stringify(user));
    }

    static removeAuthUser(): void {
        localStorage.removeItem(this.AUTH_USER_KEY);
    }

    static getCashSessionId(): number | null {
        const stored = localStorage.getItem(this.CASH_SESSION_ID_KEY);
        return stored ? parseInt(stored, 10) : null;
    }

    static setCashSessionId(id: number | null): void {
        localStorage.setItem(this.CASH_SESSION_ID_KEY, String(id ?? ''));
    }

    static removeCashSessionId(): void {
        localStorage.removeItem(this.CASH_SESSION_ID_KEY);
    }

    static getCashSessionStatus(): CashSessionStatus | null {
        const stored = localStorage.getItem(this.CASH_SESSION_STATUS_KEY);
        return (stored as CashSessionStatus) || null;
    }

    static setCashSessionStatus(status: CashSessionStatus | null): void {
        localStorage.setItem(this.CASH_SESSION_STATUS_KEY, status ?? '');
    }

    static removeCashSessionStatus(): void {
        localStorage.removeItem(this.CASH_SESSION_STATUS_KEY);
    }

    static getManagerCode(): string | null {
        return localStorage.getItem(this.MANAGER_AUTH_CODE_KEY);
    }

    static setManagerCode(code: string): void {
        localStorage.setItem(this.MANAGER_AUTH_CODE_KEY, code);
    }

    static removeManagerCode(): void {
        localStorage.removeItem(this.MANAGER_AUTH_CODE_KEY);
    }

    static clearSessionData(): void {
        this.removeAuthUser();
        this.removeCashSessionId();
        this.removeCashSessionStatus();
        this.removeManagerCode();
    }
}
