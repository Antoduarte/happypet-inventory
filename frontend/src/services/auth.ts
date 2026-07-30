import { api } from './api';
import type { LoginResponse, AuthUser } from '../interfaces/auth';
import { TokenService } from './token';
import { AuthStorageService } from './authStorage';

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

        AuthStorageService.setAuthUser(userData);

        return response;
    }

    logout(clearCashSession = true) {
        TokenService.clearTokens();
        AuthStorageService.removeAuthUser();
        if (clearCashSession) {
            AuthStorageService.removeCashSessionId();
            AuthStorageService.removeCashSessionStatus();
        }
    }
}

export const authService = new AuthService();
