import type { LoginResponse } from '../interfaces/auth';

/**
 * TokenService
 *
 * Manages the storage and retrieval of authentication tokens in localStorage.
 * This class helps decouple token management from the API service.
 */
export class TokenService {
    private static readonly ACCESS_TOKEN_KEY = 'access_token';
    private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

    /**
     * Retrieves the access token from storage.
     * @returns The access token string or null if not found.
     */
    public static getAccessToken(): string | null {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }

    /**
     * Retrieves the refresh token from storage.
     * @returns The refresh token string or null if not found.
     */
    public static getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    /**
     * Stores both access and refresh tokens in storage.
     * @param tokens - Object containing access and refresh tokens.
     */
    public static setTokens({ access, refresh }: LoginResponse): void {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
    }

    /**
     * Removes all authentication tokens from storage.
     */
    public static clearTokens(): void {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
}
