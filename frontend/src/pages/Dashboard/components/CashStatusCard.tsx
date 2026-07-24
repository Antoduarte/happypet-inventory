import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useSessionDetail } from '../../../hooks/cash';
import { useAuth } from '../../../hooks/useAuth';
import { formatCurrency } from '../../../utils/format';

export const CashStatusCard: React.FC = () => {
    const navigate = useNavigate();
    // Source of truth for the session, kept in sync app-wide (same as Sidebar).
    const { cashSessionId, cashSessionStatus } = useAuth();

    const isOpen = !!cashSessionId && cashSessionStatus !== 'closed';
    // Only fetch the session detail (for the expected balance / opened time) when one is open.
    const { data: session, isLoading } = useSessionDetail(isOpen ? cashSessionId : null);

    const goToCash = () => {
        if (cashSessionStatus === 'suspended' && cashSessionId) {
            navigate(`/cash/resume/${cashSessionId}`);
        } else if (cashSessionStatus === 'open' && cashSessionId) {
            navigate(`/cash-session/${cashSessionId}`);
        } else {
            navigate('/cash/open');
        }
    };

    const openedTime = session?.opened_at
        ? new Date(session.opened_at).toLocaleTimeString('es-NI', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    return (
        <Card title="Estado de caja">
            {isLoading ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ) : isOpen ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 size={18} />
                        {cashSessionStatus === 'suspended' ? 'Caja suspendida' : 'Caja abierta'}
                    </div>
                    {openedTime && (
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Abierta desde</span>
                            <span className="font-semibold text-slate-900">{openedTime}</span>
                        </div>
                    )}
                    {session && (
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Saldo esperado</span>
                            <span className="font-semibold tabular-nums text-slate-900">
                                {formatCurrency(session.expected_amount)}
                            </span>
                        </div>
                    )}
                    <Button variant="primary" className="mt-1 w-full" onClick={goToCash}>
                        Ir a caja
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2.5 text-sm font-semibold text-amber-700">
                        <AlertCircle size={18} />
                        No hay caja abierta
                    </div>
                    <p className="text-xs text-slate-400">Abre una caja para registrar ventas.</p>
                    <Button variant="primary" className="mt-1 w-full" onClick={goToCash}>
                        Abrir caja
                    </Button>
                </div>
            )}
        </Card>
    );
};
