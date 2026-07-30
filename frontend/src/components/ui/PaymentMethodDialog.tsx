import React, { useEffect, useRef, useState } from 'react';
import { Banknote, CreditCard, ArrowLeftRight, X, CheckCircle } from 'lucide-react';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompletionPaymentMethod = 'cash' | 'card' | 'transfer' | 'qr';

interface PaymentMethodDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Dialog title */
    title?: string;
    /** Descriptive message shown in the body */
    message?: string;
    /** Text for the confirm button */
    confirmLabel?: string;
    /** Text for the cancel button */
    cancelLabel?: string;
    /** Whether the confirm action is in progress (shows spinner) */
    isLoading?: boolean;
    /** Called when the user confirms the selected payment method */
    onConfirm: (paymentMethod: CompletionPaymentMethod) => void;
    /** Called when the user cancels or closes the dialog */
    onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Payment options
// ---------------------------------------------------------------------------

const PAYMENT_METHODS: {
    value: CompletionPaymentMethod;
    label: string;
    icon: React.ElementType;
}[] = [
    { value: 'cash', label: 'Efectivo', icon: Banknote },
    { value: 'card', label: 'Tarjeta', icon: CreditCard },
    { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
    isOpen,
    title = 'Completar Venta',
    message = 'Selecciona el método de pago con el que se completará esta venta a crédito.',
    confirmLabel = 'Confirmar Pago',
    cancelLabel = 'Cancelar',
    isLoading = false,
    onConfirm,
    onCancel,
}) => {
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    const [selected, setSelected] = useState<CompletionPaymentMethod>('cash');

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
            role="dialog"
            aria-labelledby="payment-dialog-title"
            aria-describedby="payment-dialog-message"
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
                        <div className="shrink-0 p-2.5 rounded-xl bg-emerald-50">
                            <CheckCircle size={22} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <h3
                                id="payment-dialog-title"
                                className="text-base font-semibold text-slate-800 leading-snug"
                            >
                                {title}
                            </h3>
                            <p
                                id="payment-dialog-message"
                                className="mt-1.5 text-sm text-slate-500 leading-relaxed"
                            >
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Payment method options */}
                    <div className="mt-5 space-y-2" role="radiogroup" aria-label="Método de pago">
                        {PAYMENT_METHODS.map((method) => {
                            const Icon = method.icon;
                            const isActive = selected === method.value;
                            return (
                                <button
                                    key={method.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={isActive}
                                    onClick={() => setSelected(method.value)}
                                    className={[
                                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                                        isActive
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                    ].join(' ')}
                                >
                                    <Icon size={18} />
                                    {method.label}
                                </button>
                            );
                        })}
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
                            variant="primary"
                            onClick={() => onConfirm(selected)}
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

export default PaymentMethodDialog;
