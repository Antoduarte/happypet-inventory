import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Banknote,
    CreditCard,
    DollarSign,
    History,
    Landmark,
    ShoppingBag,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { MovementsTable } from '../CashSession/components/MovementsTable';
import { ClosureHistorySidebar } from '../CashSession/components/ClosureHistorySidebar';
import { SalesDetailTable } from '../Reports/components/SalesDetailTable';
import { useSessionReport, useCashMovements } from '../../hooks/cash';
import { formatCurrency } from '../../utils/format';

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    const date = d.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
};

export const ClosedCashSessionDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const numericId = id ? parseInt(id, 10) : null;

    const { data: report, isLoading, error } = useSessionReport(numericId);
    const { data: movements } = useCashMovements(numericId ?? undefined);
    const [showHistory, setShowHistory] = useState(false);

    if (isLoading || !numericId) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Detalle de Caja"
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Historial de Cajas', path: '/closed-cash-sessions' },
                        { label: 'Cargando...' },
                    ]}
                    action={
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/closed-cash-sessions')}
                        >
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    }
                />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Detalle de Caja"
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Historial de Cajas', path: '/closed-cash-sessions' },
                        { label: 'No encontrada' },
                    ]}
                    action={
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/closed-cash-sessions')}
                        >
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    }
                />
                <div className="text-center py-12">
                    <p className="text-slate-500 mb-4">
                        No se encontró la caja o no tenés permiso para verla.
                    </p>
                    <Button onClick={() => navigate('/closed-cash-sessions')}>
                        Volver al listado
                    </Button>
                </div>
            </div>
        );
    }

    const difference = report.difference !== null ? parseFloat(report.difference) : null;
    const differenceClass =
        difference === null
            ? 'text-slate-400'
            : difference === 0
              ? 'text-emerald-600'
              : difference > 0
                ? 'text-blue-600'
                : 'text-rose-600';

    return (
        <div className="space-y-5">
            <PageHeader
                title={`Caja #${report.id} — ${report.cash_register_name}`}
                breadcrumbs={[
                    { label: 'Panel', path: '/' },
                    { label: 'Historial de Cajas', path: '/closed-cash-sessions' },
                    { label: `Caja #${report.id}` },
                ]}
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            className="flex flex-row items-center justify-center gap-2"
                            onClick={() => setShowHistory(true)}
                        >
                            <History size={15} /> Historial de Cierres
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/closed-cash-sessions')}
                        >
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    </div>
                }
            />

            {/* Metadata */}
            <Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Usuario
                        </p>
                        <p className="font-medium text-slate-800">{report.user_name}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Apertura
                        </p>
                        <p className="font-medium text-slate-800">
                            {formatDateTime(report.opened_at)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Ventas
                        </p>
                        <p className="font-medium text-slate-800">
                            {report.sales_count} · {formatCurrency(report.sales_total)}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Monto Apertura"
                    value={formatCurrency(report.opening_amount)}
                    icon={DollarSign}
                    bgClass="bg-emerald-50"
                    iconClass="text-emerald-600"
                />
                <SummaryCard
                    title="Ventas Totales"
                    value={formatCurrency(report.sales_total)}
                    icon={ShoppingBag}
                    bgClass="bg-blue-50"
                    iconClass="text-blue-600"
                />
                <SummaryCard
                    title="Ingresos"
                    value={formatCurrency(report.income_total)}
                    icon={TrendingUp}
                    bgClass="bg-violet-50"
                    iconClass="text-violet-600"
                />
                <SummaryCard
                    title="Egresos"
                    value={formatCurrency(report.expense_total)}
                    icon={TrendingDown}
                    bgClass="bg-rose-50"
                    iconClass="text-rose-600"
                />
            </div>

            {/* Expected vs Counted */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Monto Esperado
                        </p>
                        <p className="text-2xl font-bold text-slate-800">
                            {formatCurrency(report.expected_amount)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Monto Contado
                        </p>
                        <p className="text-2xl font-bold text-slate-800">
                            {report.counted_amount !== null
                                ? formatCurrency(report.counted_amount)
                                : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Diferencia
                        </p>
                        <p className={`text-2xl font-bold ${differenceClass}`}>
                            {difference === null
                                ? '—'
                                : `${difference >= 0 ? '+' : ''}${formatCurrency(difference)}`}
                        </p>
                    </div>
                </div>
                {report.notes && (
                    <p className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 italic">
                        {report.notes}
                    </p>
                )}
            </Card>

            {/* Payment methods */}
            <Card title="Ventas por Método de Pago">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <MetricCard
                        label="Efectivo"
                        value={formatCurrency(report.cash_sales_total)}
                        icon={Banknote}
                        iconBg="bg-emerald-100"
                        iconColor="text-emerald-600"
                    />
                    <MetricCard
                        label="Tarjeta"
                        value={formatCurrency(report.card_sales_total)}
                        icon={CreditCard}
                        iconBg="bg-sky-100"
                        iconColor="text-sky-600"
                    />
                    <MetricCard
                        label="Transferencia"
                        value={formatCurrency(report.transfer_sales_total)}
                        icon={Landmark}
                        iconBg="bg-violet-100"
                        iconColor="text-violet-600"
                    />
                    <MetricCard
                        label="Crédito"
                        value={formatCurrency(report.credit_sales_total)}
                        icon={Wallet}
                        iconBg="bg-amber-100"
                        iconColor="text-amber-600"
                    />
                </div>
            </Card>

            {/* Sales detail */}
            <Card title="Ventas de la Caja">
                <SalesDetailTable start="" end="" sellerId={null} cashSessionId={report.id} />
            </Card>

            {/* Movements */}
            {movements && movements.length > 0 && <MovementsTable movements={movements} />}

            <ClosureHistorySidebar
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                sessionId={report.id}
            />
        </div>
    );
};
