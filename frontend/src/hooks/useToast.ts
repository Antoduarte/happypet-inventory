import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';
import type { ToastContextValue } from '../context/ToastContext';

/**
 * useToast
 *
 * Hook de acceso al contexto de Toast. Lanza un error descriptivo si se usa
 * fuera del ToastProvider (fail-fast principle).
 */
export const useToast = (): ToastContextValue => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return ctx;
};
