import axios from 'axios';

/**
 * AppError
 *
 * Responsabilidad única: traducir errores de red/HTTP en mensajes
 * comprensibles para el usuario. Centraliza toda la lógica de mapeo
 * de errores para que otros módulos no necesiten conocer los detalles
 * de Axios o de la API.
 */
export class AppError extends Error {
    statusCode: number | undefined;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
    }

    /**
     * Extrae un mensaje legible del body de un error DRF/Axios.
     * Prioriza "detail", "message" o "error", luego errores por campo,
     * y por último strings planos.
     */
    private static extractDetail(data: unknown): string | null {
        if (typeof data === 'string' && data.trim()) return data;

        if (data && typeof data === 'object') {
            const record = data as Record<string, unknown>;
            for (const key of ['detail', 'message', 'error']) {
                const value = record[key];
                if (typeof value === 'string' && value.trim()) return value;
            }

            const fieldErrors: string[] = [];
            for (const [field, value] of Object.entries(record)) {
                if (field === 'non_field_errors') {
                    fieldErrors.push(...(Array.isArray(value) ? value : [value]).map(String));
                    continue;
                }
                const messages = Array.isArray(value) ? value : [value];
                fieldErrors.push(`${field}: ${messages.map(String).join(', ')}`);
            }
            if (fieldErrors.length > 0) return fieldErrors.join('\n');
        }

        return null;
    }

    /**
     * Fábrica estática: convierte cualquier error desconocido en un AppError
     * con un mensaje legible por el usuario.
     */
    static from(error: unknown): AppError {
        if (error instanceof AppError) return error;

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const detail = error.response ? this.extractDetail(error.response.data) : null;
            if (detail) {
                return new AppError(detail, status);
            }

            const httpMessages: Record<number, string> = {
                400: 'Los datos enviados no son válidos.',
                401: 'Correo electrónico o contraseña incorrectos.',
                403: 'No tienes permiso para realizar esta acción.',
                404: 'El recurso solicitado no fue encontrado.',
                429: 'Demasiados intentos. Intenta de nuevo más tarde.',
                500: 'Error interno del servidor. Intenta más tarde.',
                502: 'El servidor no está disponible en este momento.',
                503: 'Servicio temporalmente no disponible.',
            };

            if (status && status in httpMessages) {
                return new AppError(httpMessages[status], status);
            }

            if (!error.response) {
                return new AppError(
                    'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
                );
            }

            return new AppError(`Error inesperado (${status ?? 'desconocido'}).`, status);
        }

        if (error instanceof Error) {
            return new AppError(error.message);
        }

        return new AppError('Ocurrió un error inesperado.');
    }
}
