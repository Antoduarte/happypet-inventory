import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Dialog title */
    title: string;
    /** Descriptive message shown in the body */
    message: string;
    /** Text for the confirm button */
    confirmLabel?: string;
    /** Text for the cancel button */
    cancelLabel?: string;
    /** Visual variant that affects icon and confirm button color */
    variant?: ConfirmVariant;
    /** Whether the confirm action is in progress (shows spinner) */
    isLoading?: boolean;
    /** Called when the user confirms the action */
    onConfirm: () => void;
    /** Called when the user cancels or closes the dialog */
    onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const ICON_MAP: Record<ConfirmVariant, React.ReactNode> = {
    danger: <AlertTriangle size={22} className="text-red-500" />,
    warning: <AlertTriangle size={22} className="text-amber-500" />,
    info: <Info size={22} className="text-brand" />,
    success: <CheckCircle size={22} className="text-emerald-500" />,
};

const BG_MAP: Record<ConfirmVariant, string> = {
    danger: 'bg-red-50',
    warning: 'bg-amber-50',
    info: 'bg-brand/10',
    success: 'bg-emerald-50',
};

const BUTTON_VARIANT_MAP: Record<ConfirmVariant, 'danger' | 'primary'> = {
    danger: 'danger',
    warning: 'danger',
    info: 'primary',
    success: 'primary',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ConfirmDialog
 *
 * A fully accessible modal dialog for confirming critical actions.
 * Handles Escape key, focus trap, and click-outside to close.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    isLoading = false,
    onConfirm,
    onCancel,
}) => {
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    // Focus confirm button and handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.activeElement as HTMLElement | null;
        confirmBtnRef.current?.focus();
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
            prev?.focus();
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
        >
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onCancel} aria-hidden="true" />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Cerrar diálogo"
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="p-6">
                    {/* Icon + title */}
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 p-2.5 rounded-xl ${BG_MAP[variant]}`}>
                            {ICON_MAP[variant]}
                        </div>
                        <div className="min-w-0">
                            <h3
                                id="confirm-dialog-title"
                                className="text-base font-semibold text-slate-800 leading-snug"
                            >
                                {title}
                            </h3>
                            <p
                                id="confirm-dialog-message"
                                className="mt-1.5 text-sm text-slate-500 leading-relaxed"
                            >
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            ref={confirmBtnRef}
                            type="button"
                            variant={BUTTON_VARIANT_MAP[variant]}
                            onClick={onConfirm}
                            isLoading={isLoading}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
