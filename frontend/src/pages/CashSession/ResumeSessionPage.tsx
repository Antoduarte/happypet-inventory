import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useSessionDetail, useResumeSession } from '../../hooks/cash';
import { useAuth } from '../../hooks/useAuth';
import { AppError } from '../../services/errors';
import { useToast } from '../../hooks/useToast';
import type { CashSessionStatus } from '../../interfaces/auth';

export const ResumeSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const numericSessionId = sessionId ? parseInt(sessionId, 10) : null;
    const { updateCashSession } = useAuth();
    const { showToast } = useToast();

    const {
        data: session,
        isLoading: isSessionLoading,
        error,
    } = useSessionDetail(numericSessionId);
    const { mutate: resumeSession, isPending: isResumeLoading } = useResumeSession();

    const handleResume = () => {
        if (!numericSessionId) return;

        resumeSession(numericSessionId, {
            onSuccess: (resumedSession) => {
                updateCashSession(resumedSession.id, resumedSession.status as CashSessionStatus);
                showToast('Sesión de caja reanudada', 'success');
                navigate('/', { replace: true });
            },
            onError: (error) => {
                const appError = AppError.from(error);
                showToast(appError.message, 'error');
            },
        });
    };

    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full mx-auto" />
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                    <p className="text-slate-600 mb-4">No se encontró la sesión de caja.</p>
                    <Button variant="secondary" onClick={() => navigate('/')}>
                        Volver al inicio
                    </Button>
                </div>
            </div>
        );
    }

    const openingAmount = parseFloat(session.opening_amount || '0');
    const countedAmount = session.counted_amount ? parseFloat(session.counted_amount) : null;
    const difference = session.difference ? parseFloat(session.difference) : null;
    const suspendedAt = session.suspended_at
        ? new Date(session.suspended_at).toLocaleString('es-NI', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-muted/20 blur-3xl"></div>
                <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-brand/10 blur-3xl"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center flex-col items-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                        <PlayCircle className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                        HappyPet
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">Caja Suspendida</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100 space-y-6">
                    <Card className="bg-slate-50 border border-slate-200">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Caja</span>
                                <span className="text-sm font-semibold text-slate-700">
                                    {session.cash_register_name}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Monto de apertura</span>
                                <span className="text-sm font-semibold text-slate-700">
                                    ${openingAmount.toFixed(2)}
                                </span>
                            </div>
                            {suspendedAt && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Último cierre</span>
                                    <span className="text-sm font-semibold text-slate-700">
                                        {suspendedAt}
                                    </span>
                                </div>
                            )}
                            {countedAmount !== null && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Efectivo contado</span>
                                    <span className="text-sm font-semibold text-slate-700">
                                        ${countedAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {difference !== null && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Diferencia</span>
                                    <span
                                        className={`text-sm font-semibold ${
                                            difference === 0
                                                ? 'text-emerald-600'
                                                : difference > 0
                                                  ? 'text-blue-600'
                                                  : 'text-red-600'
                                        }`}
                                    >
                                        {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Button
                        type="button"
                        className="w-full justify-center py-3 text-base gap-2"
                        onClick={handleResume}
                        isLoading={isResumeLoading}
                        disabled={isResumeLoading}
                    >
                        <PlayCircle size={20} />
                        Reanudar Sesión
                    </Button>
                </div>
            </div>
        </div>
    );
};
