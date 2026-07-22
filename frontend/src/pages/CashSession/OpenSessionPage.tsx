import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useOpenSession } from '../../hooks/cash';
import { useAuth } from '../../hooks/useAuth';
import { AppError } from '../../services/errors';
import { useToast } from '../../hooks/useToast';
import type { CashSessionStatus } from '../../interfaces/auth';

export const OpenSessionPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { mutate: openSession } = useOpenSession();
    const { updateCashSession } = useAuth();

    const [openingAmount, setOpeningAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(openingAmount) || 0;

        openSession(
            { opening_amount: String(amount) },
            {
                onSuccess: (session) => {
                    updateCashSession(session.id, session.status as CashSessionStatus);
                    navigate('/', { replace: true });
                },
                onError: (error) => {
                    const appError = AppError.from(error);
                    showToast(appError.message, 'error');
                },
            },
        );
    };

    const disabled = useMemo(() => {
        const amount = parseFloat(openingAmount);
        return isNaN(amount) || amount < 0;
    }, [openingAmount]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-muted/20 blur-3xl"></div>
                <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-brand/10 blur-3xl"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center flex-col items-center">
                    <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30 mb-2">
                        <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                        HappyPet
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">Apertura de Caja</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label
                                htmlFor="opening_amount"
                                className="block text-sm font-medium text-slate-700 mb-1.5"
                            >
                                Monto de Apertura
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                                    $
                                </span>
                                <input
                                    id="opening_amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                Efectivo disponible al iniciar la sesión
                            </p>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full justify-center py-2.5 text-base"
                                // isLoading={isPending}
                                disabled={disabled}
                            >
                                Continuar
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
