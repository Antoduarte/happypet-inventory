export interface LoginResponse {
    access: string;
    refresh: string;
    role: 'admin' | 'manager' | 'cashier';
    user_id: number;
    name: string;
    email: string;
}

export interface LocationState {
    from?: {
        pathname: string;
    };
}

export interface AuthUser {
    id: number | null;
    role: UserRole | null;
    name: string;
    hasCashSession: boolean;
    cashSessionId?: number | null;
    cashSessionStatus?: CashSessionStatus | null;
}

export type CashSessionStatus = 'open' | 'suspended' | 'closed';
export type UserRole = 'admin' | 'manager' | 'cashier';
