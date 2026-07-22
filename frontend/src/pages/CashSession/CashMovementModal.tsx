import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useCreateCashMovement } from '../../hooks/cash';
import type { MovementType } from '../../interfaces/cash';

const movementSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.string().min(1, 'El monto es requerido'),
    reason: z.string().min(1, 'El motivo es requerido').max(255),
});

type MovementForm = z.infer<typeof movementSchema>;

interface CashMovementModalProps {
    sessionId: number;
    onClose: () => void;
    onSuccess: () => void;
    open: boolean;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({
    sessionId,
    onClose,
    onSuccess,
    open,
}) => {
    const [selectedType, setSelectedType] = useState<MovementType>('income');

    const { mutate: createMovement, isPending: isLoading } = useCreateCashMovement();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<MovementForm>({
        resolver: zodResolver(movementSchema),
        defaultValues: { type: 'income', amount: '', reason: '' },
    });

    const onSubmit = (data: MovementForm) => {
        createMovement(
            {
                cash_session: sessionId,
                type: data.type,
                amount: data.amount,
                reason: data.reason,
            },
            {
                onSuccess: () => {
                    reset();
                    onSuccess();
                },
            },
        );
    };

    return (
        <Modal isOpen={open} onClose={onClose} title="Nuevo Movimiento de Caja">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tipo de Movimiento
                    </label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedType('income');
                                reset({ ...reset, type: 'income' });
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                                selectedType === 'income'
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            <TrendingUp size={16} />
                            Ingreso
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedType('expense');
                                reset({ ...reset, type: 'expense' });
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                                selectedType === 'expense'
                                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            <TrendingDown size={16} />
                            Egreso
                        </button>
                    </div>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                            $
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                            placeholder="0.00"
                            {...register('amount')}
                        />
                    </div>
                    {errors.amount && (
                        <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                    )}
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Motivo
                    </label>
                    <input
                        type="text"
                        maxLength={255}
                        className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                        placeholder="Descripción del movimiento..."
                        {...register('reason')}
                    />
                    {errors.reason && (
                        <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                        {selectedType === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
