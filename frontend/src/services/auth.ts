import { api } from './api';
import type { LoginResponse, AuthUser } from '../interfaces/auth';
import { TokenService } from './token';

class AuthService {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });

        TokenService.setTokens(response);

        const userData: AuthUser = {
            id: response.user_id,
            role: response.role,
            name: response.name,
            hasCashSession: false,
            cashSessionId: null,
            cashSessionStatus: null,
        };

        localStorage.setItem('auth_user', JSON.stringify(userData));

        return response;
    }

    logout(clearCashSession = true) {
        TokenService.clearTokens();
        localStorage.removeItem('auth_user');
        if (clearCashSession) {
            localStorage.removeItem('cash_session_id');
            localStorage.removeItem('cash_session_status');
        }
    }
}

export const authService = new AuthService();
