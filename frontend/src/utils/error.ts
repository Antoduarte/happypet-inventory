/**
 * Helper to get error message from an error.
 * @param error The error to get the message from.
 * @param defaultMessage The default message to return if the error is not an instance of Error.
 * @returns The error message.
 */
export const getErrorMessage = (error: unknown, defaultMessage?: string): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return defaultMessage || 'Error desconocido';
};
