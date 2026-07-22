import React, { useState, useCallback, useMemo } from 'react';
import { ToastContext } from './ToastContext';
import type { Toast, ToastType } from './ToastContext';
import { ToastContainer } from '../components/ui/Toast';

const TOAST_DURATION_MS = 6000;

/**
 * ToastProvider
 *
 * Responsabilidad única: gestionar el ciclo de vida de los toasts
 * (crear, mostrar con auto-dismiss y eliminar).
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    }, []);

    const value = useMemo(
        () => ({ toasts, showToast, removeToast }),
        [toasts, showToast, removeToast],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};
