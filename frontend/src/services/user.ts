import { api } from '@/services/api';
import { AppError } from '@/services/errors';

export interface User {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'cashier';
    role_display: string;
    is_active: boolean;
    date_joined: string;
    code?: string;
}

export interface CreateUserPayload {
    email: string;
    name: string;
    password: string;
    role: 'admin' | 'manager' | 'cashier';
    is_active?: boolean;
    code?: string;
}

export interface UpdateUserPayload {
    name?: string;
    password?: string;
    role?: 'admin' | 'manager' | 'cashier';
    is_active?: boolean;
    code?: string;
}

export interface VerifyCodeResponse {
    valid: boolean;
    user?: {
        id: number;
        name: string;
        role: string;
    };
}

const USERS_URL = '/users/';

class UserService {
    async getUsers(): Promise<User[]> {
        try {
            const response = await api.get<User[]>(USERS_URL);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async getUserById(id: number): Promise<User> {
        try {
            return await api.get<User>(`${USERS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async createUser(payload: CreateUserPayload): Promise<User> {
        try {
            return await api.post<User>(USERS_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
        try {
            return await api.patch<User>(`${USERS_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async deleteUser(id: number): Promise<void> {
        try {
            await api.delete<void>(`${USERS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    async verifyCode(code: string): Promise<VerifyCodeResponse> {
        try {
            return await api.post<VerifyCodeResponse>(`${USERS_URL}verify-code/`, { code });
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

export const userService = new UserService();
