import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowLeft,
    Plus,
    Receipt,
    Banknote,
    Clock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SummaryCard } from '../../components/ui/SummaryCard';

import { CashMovementModal } from './CashMovementModal';
import { CloseSessionModal } from './CloseSessionModal';
import { ClosureHistorySidebar } from './components/ClosureHistorySidebar';
import { useSessionDetail } from '../../hooks/cash';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';

import { SalesBreakdown } from './components/SalesBreakdown';
import { MovementsTable } from './components/MovementsTable';
import type { CashSessionStatus } from '../../interfaces/auth';

export const CurrentSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const numericSessionId = sessionId ? parseInt(sessionId, 10) : null;
    const { updateCashSession } = useAuth();

    const { data: session, isLoading, error, refetch } = useSessionDetail(numericSessionId);
    const { canCloseAnySession, userId } = usePermission();

    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const canCloseSession = canCloseAnySession || session?.user === userId;
    const canAddMovement = canCloseAnySession || session?.user === userId;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 mb-4">No se encontró la sesión de caja.</p>
                <Button variant="secondary" onClick={() => navigate('/')}>
                    <ArrowLeft size={15} /> Volver
                </Button>
            </div>
        );
    }

    if (session.status === 'suspended') {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Esta sesión está suspendida.</p>
                <Button variant="secondary" onClick={() => navigate(`/cash/resume/${session.id}`)}>
                    <ArrowLeft size={15} /> Ir a Reanudar Sesión
                </Button>
            </div>
        );
    }

    const openingAmount = parseFloat(session.opening_amount || '0');
    const expectedAmount = parseFloat(session.expected_amount || '0');
    const difference = session.difference ? parseFloat(session.difference) : null;

    const cashSales =
        session.sales
            ?.filter((s) => s.payment_type === 'cash')
            .reduce((sum, s) => sum + parseFloat(s.total_price || '0'), 0) ?? 0;

    const incomeTotal =
        session.movements
            ?.filter((m) => m.type === 'income' && !m.reason.startsWith('Sale #'))
            .reduce((sum, m) => sum + parseFloat(m.amount), 0) ?? 0;

    const expenseTotal =
        session.movements
            ?.filter((m) => m.type === 'expense' && !m.reason.startsWith('Sale #'))
            .reduce((sum, m) => sum + parseFloat(m.amount), 0) ?? 0;

    return (
        <div className="space-y-5">
            <PageHeader
                title={`Sesión: ${session.cash_register_name}`}
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: `Sesión #${session.id}` }]}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Monto Apertura"
                    value={`C$${openingAmount.toFixed(2)}`}
                    icon={DollarSign}
                    bgClass="bg-emerald-50"
                    iconClass="text-emerald-600"
                />
                <SummaryCard
                    title="Ventas Efectivo"
                    value={`C$${cashSales.toFixed(2)}`}
                    icon={Banknote}
                    bgClass="bg-blue-50"
                    iconClass="text-blue-600"
                />
                <SummaryCard
                    title="Ingresos"
                    value={`C$${incomeTotal.toFixed(2)}`}
                    icon={TrendingUp}
                    bgClass="bg-violet-50"
                    iconClass="text-violet-600"
                />
                <SummaryCard
                    title="Egresos"
                    value={`C$${expenseTotal.toFixed(2)}`}
                    icon={TrendingDown}
                    bgClass="bg-rose-50"
                    iconClass="text-rose-600"
                />
            </div>

            {/* Expected vs Counted */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Monto Esperado
                        </p>
                        <p className="text-3xl font-bold text-slate-800">
                            C${expectedAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Apertura + Ventas efectivo + Ingresos - Egresos
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Diferencia
                        </p>
                        <p
                            className={`text-2xl font-bold ${difference === 0 ? 'text-emerald-600' : difference !== null && difference > 0 ? 'text-blue-600' : 'text-rose-600'}`}
                        >
                            {difference !== null
                                ? `${difference >= 0 ? '+' : ''}C$${difference.toFixed(2)}`
                                : '—'}
                        </p>
                    </div>
                </Card>

                <Card className="flex flex-col justify-center">
                    <Button
                        variant="secondary"
                        className="w-full gap-2 mb-2"
                        onClick={() => setShowMovementModal(true)}
                        disabled={!canAddMovement}
                    >
                        <Plus size={15} /> Movimiento
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full gap-2 mb-2"
                        onClick={() => setShowHistory(true)}
                    >
                        <Clock size={15} /> Ver Historial
                    </Button>
                    <Button
                        className="w-full gap-2"
                        onClick={() => setShowCloseModal(true)}
                        disabled={!canCloseSession}
                    >
                        <Receipt size={15} /> Cerrar Sesión
                    </Button>
                </Card>
            </div>

            {/* Sales Breakdown */}
            {session.sales && session.sales.length > 0 && <SalesBreakdown sales={session.sales} />}

            {/* Movements List */}
            {session.movements && session.movements.length > 0 && (
                <MovementsTable movements={session.movements} />
            )}

            {/* Modals */}

            <CashMovementModal
                sessionId={session.id}
                onClose={() => setShowMovementModal(false)}
                onSuccess={() => {
                    setShowMovementModal(false);
                    refetch();
                }}
                open={showMovementModal}
            />

            <CloseSessionModal
                session={session}
                onClose={() => setShowCloseModal(false)}
                onSuccess={(closedSession) => {
                    setShowCloseModal(false);
                    updateCashSession(closedSession.id, closedSession.status as CashSessionStatus);
                    navigate('/', { replace: true });
                }}
                isOpen={showCloseModal}
            />

            <ClosureHistorySidebar
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                sessionId={session.id}
            />
        </div>
    );
};
