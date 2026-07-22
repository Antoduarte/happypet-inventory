import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Check } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useCloseSession } from '../../hooks/cash';
import type { CashSession } from '../../interfaces/cash';

const closeSchema = z.object({
    counted_amount: z.string().min(1, 'El monto contado es requerido'),
    notes: z.string().max(500).optional(),
});

type CloseForm = z.infer<typeof closeSchema>;

interface CloseSessionModalProps {
    session: CashSession;
    onClose: () => void;
    onSuccess: (session: CashSession) => void;
    isOpen: boolean;
}

export const CloseSessionModal: React.FC<CloseSessionModalProps> = ({
    session,
    onClose,
    onSuccess,
    isOpen,
}) => {
    const { mutate: closeSession, isLoading } = useCloseSession();

    const openingAmount = parseFloat(session.opening_amount || '0');
    const expectedAmount = parseFloat(session.expected_amount || '0');

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<CloseForm>({
        resolver: zodResolver(closeSchema),
        defaultValues: { counted_amount: '', notes: '' },
    });

    const watchedCounted = watch('counted_amount');
    const countedAmount = watchedCounted ? parseFloat(watchedCounted) : 0;
    const difference = countedAmount - expectedAmount;

    const onSubmit = (data: CloseForm) => {
        closeSession(
            {
                sessionId: session.id,
                payload: { counted_amount: data.counted_amount, notes: data.notes },
            },
            {
                onSuccess: (closedSession) => {
                    onSuccess(closedSession);
                },
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cerrar Caja">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Summary before close */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">Monto de apertura</p>
                        <p className="text-sm font-semibold text-slate-700">
                            ${openingAmount.toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">Monto esperado</p>
                        <p className="text-sm font-semibold text-slate-700">
                            ${expectedAmount.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Counted Amount */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Efectivo Contado <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                            $
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                            placeholder="0.00"
                            {...register('counted_amount')}
                        />
                    </div>
                    {errors.counted_amount && (
                        <p className="mt-1 text-sm text-red-600">{errors.counted_amount.message}</p>
                    )}
                </div>

                {/* Difference Preview */}
                {watchedCounted && !isNaN(difference) && (
                    <div
                        className={`flex items-center gap-3 p-4 rounded-xl ${difference === 0 ? 'bg-emerald-50 border border-emerald-200' : difference > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-rose-50 border border-rose-200'}`}
                    >
                        <div
                            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${difference === 0 ? 'bg-emerald-100 text-emerald-600' : difference > 0 ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}
                        >
                            {difference === 0 ? <Check size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400">Diferencia</p>
                            <p
                                className={`text-lg font-bold ${difference === 0 ? 'text-emerald-700' : difference > 0 ? 'text-blue-700' : 'text-rose-700'}`}
                            >
                                {difference >= 0 ? '+' : ''}C${difference.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Observaciones
                    </label>
                    <textarea
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none"
                        placeholder="Notas adicionales sobre el cierre..."
                        {...register('notes')}
                    />
                    {errors.notes && (
                        <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={isLoading || !watchedCounted}
                    >
                        Cerrar Caja
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
