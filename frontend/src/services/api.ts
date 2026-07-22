import axios from 'axios';
import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import type { LoginResponse } from '../interfaces/auth';
import { TokenService } from './token';

/**
 * ApiBaseService
 *
 * Implementa el patrón Facade sobre Axios para centralizar:
 * - Configuración base (baseURL, headers)
 * - Interceptores (Autenticación, Manejo uniforme de errores)
 * - Métodos genéricos CRUD
 */
export class ApiBaseService {
    protected client: AxiosInstance;
    private isRefreshing: boolean = false;
    private failedQueue: any[] = [];

    constructor(baseURL: string, config?: AxiosRequestConfig) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            ...config,
        });

        this.setupInterceptors();
    }

    /**
     * Configura los interceptores para requests y responses.
     * Aquí se inyecta el token JWT en las peticiones y se manejan errores globales.
     */
    private setupInterceptors() {
        // Interceptor de Petición (Inyectar Token)
        this.client.interceptors.request.use(
            (config) => {
                const token = TokenService.getAccessToken();
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error),
        );

        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & {
                    _retry?: boolean;
                };

                const isRefreshRequest = originalRequest?.url?.includes('/auth/token/refresh/');
                if (error.response?.status === 401 && isRefreshRequest) {
                    this.processQueue(error, null);
                    this.forceLogout();
                    return Promise.reject(error);
                }

                const hasSession = !!TokenService.getAccessToken();
                if (error.response?.status === 401 && !originalRequest._retry && hasSession) {
                    if (this.isRefreshing) {
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject });
                        })
                            .then((token) => {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                                return this.client(originalRequest);
                            })
                            .catch((err) => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        const refreshToken = TokenService.getRefreshToken();

                        // Llamada al endpoint de refresh
                        const response = await this.post<LoginResponse>('/auth/token/refresh/', {
                            refresh: refreshToken,
                        });

                        TokenService.setTokens(response);

                        const access = TokenService.getAccessToken();

                        // Actualizar header de la petición original y procesar la cola
                        this.client.defaults.headers.common['Authorization'] = `Bearer ${access}`;
                        this.processQueue(null, access);

                        return this.client(originalRequest);
                    } catch (refreshError) {
                        // Si el refresh también falla, el usuario debe loguearse de nuevo
                        this.processQueue(refreshError, null);
                        this.forceLogout();
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }
                return Promise.reject(error);
            },
        );
    }

    private processQueue = (error: any, token: string | null = null) => {
        this.failedQueue.forEach((prom) => {
            if (error) prom.reject(error);
            else prom.resolve(token);
        });

        this.failedQueue = [];
    };

    private forceLogout() {
        TokenService.clearTokens();
        window.location.href = '/login';
    }

    /**
     * Petición GET genérica
     */
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.client.get(url, config);
        return response.data;
    }

    /**
     * Petición POST genérica
     */
    public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.client.post(url, data, config);
        return response.data;
    }

    /**
     * Petición PUT genérica (Reemplazo completo)
     */
    public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.client.put(url, data, config);
        return response.data;
    }

    /**
     * Petición PATCH genérica (Actualización parcial)
     */
    public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.client.patch(url, data, config);
        return response.data;
    }

    /**
     * Petición DELETE genérica
     */
    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.client.delete(url, config);
        return response.data;
    }
}

export const api = new ApiBaseService('/api');
