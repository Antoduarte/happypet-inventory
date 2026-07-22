import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast, ToastType } from '../../context/ToastContext';

// ──────────────────────────────────────────────────────────────────────────────
// Config maps (Open/Closed Principle: agregar un tipo = agregar una entrada aquí)
// ──────────────────────────────────────────────────────────────────────────────

const toastConfig: Record<
    ToastType,
    { icon: React.ReactNode; wrapperClass: string; iconClass: string; barClass: string }
> = {
    success: {
        icon: <CheckCircle2 className="w-5 h-5" />,
        wrapperClass: 'bg-white border-emerald-500',
        iconClass: 'text-emerald-500',
        barClass: 'bg-emerald-500',
    },
    error: {
        icon: <XCircle className="w-5 h-5" />,
        wrapperClass: 'bg-red-50 border-red-500',
        iconClass: 'text-red-500',
        barClass: 'bg-red-500',
    },
    warning: {
        icon: <AlertTriangle className="w-5 h-5" />,
        wrapperClass: 'bg-white border-amber-500',
        iconClass: 'text-amber-500',
        barClass: 'bg-amber-500',
    },
    info: {
        icon: <Info className="w-5 h-5" />,
        wrapperClass: 'bg-white border-blue-500',
        iconClass: 'text-blue-500',
        barClass: 'bg-blue-500',
    },
};

// ──────────────────────────────────────────────────────────────────────────────
// ToastItem — un único toast animado
// ──────────────────────────────────────────────────────────────────────────────

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const ANIMATION_DURATION_MS = 300;

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    const [visible, setVisible] = useState(false);
    const config = toastConfig[toast.type];

    // Montar con animación de entrada
    useEffect(() => {
        const enterTimer = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(enterTimer);
    }, []);

    const handleRemove = () => {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), ANIMATION_DURATION_MS);
    };

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={`
        flex items-start gap-3 w-full max-w-sm
        border-l-4 rounded-md alert-shadow px-4 py-3
        transition-all duration-300 ease-out
        ${config.wrapperClass}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
        >
            {/* Icono */}
            <span className={`shrink-0 mt-0.5 ${config.iconClass}`}>{config.icon}</span>

            {/* Mensaje */}
            <p className="text-sm text-slate-700 flex-1 leading-snug">{toast.message}</p>

            {/* Botón cerrar */}
            <button
                onClick={handleRemove}
                className="shrink-0 text-black mt-0.5"
                aria-label="Cerrar notificación"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// ToastContainer — portal que renderiza todos los toasts activos
// ──────────────────────────────────────────────────────────────────────────────

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return createPortal(
        <div
            aria-label="Notificaciones"
            className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end"
            style={{ minWidth: '320px' }}
        >
            {toasts.map((toast) => (
                <div key={toast.id} className="relative w-full overflow-hidden">
                    <ToastItem toast={toast} onRemove={onRemove} />
                </div>
            ))}

            {/* Keyframe de la barra de progreso inyectado inline */}
            <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
        </div>,
        document.body,
    );
};
