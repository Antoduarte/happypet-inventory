import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowLeft,
    Receipt,
    CreditCard,
    Banknote,
    ArrowLeftRight,
    QrCode,
    Wallet,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useSessionReport } from '../../hooks/cash';

export const SessionReportPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const numericSessionId = sessionId ? parseInt(sessionId, 10) : null;

    const { data: report, isLoading, error } = useSessionReport(numericSessionId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 mb-4">No se pudo cargar el reporte.</p>
                <Button variant="secondary" onClick={() => navigate('/cash-session')}>
                    <ArrowLeft size={15} /> Volver
                </Button>
            </div>
        );
    }

    const openingAmount = parseFloat(report.opening_amount || '0');
    const expectedAmount = parseFloat(report.expected_amount || '0');
    const countedAmount = report.counted_amount ? parseFloat(report.counted_amount) : null;
    const difference = report.difference !== null ? parseFloat(String(report.difference)) : null;

    const payments = [
        { type: 'cash', label: 'Efectivo', icon: Banknote, total: report.cash_sales_total },
        { type: 'card', label: 'Tarjeta', icon: CreditCard, total: report.card_sales_total },
        {
            type: 'transfer',
            label: 'Transferencia',
            icon: ArrowLeftRight,
            total: report.transfer_sales_total,
        },
        { type: 'qr', label: 'QR', icon: QrCode, total: report.qr_sales_total },
        { type: 'credit', label: 'Crédito', icon: Wallet, total: report.credit_sales_total },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Reporte de Sesión de Caja"
                breadcrumbs={[
                    { label: 'Panel', path: '/' },
                    { label: 'Caja', path: '/cash-session' },
                    { label: `Sesión #${report.id}` },
                    { label: 'Reporte' },
                ]}
            />

            {/* Header Summary */}
            <Card>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                            Caja
                        </p>
                        <p className="text-lg font-bold text-slate-800">
                            {report.cash_register_name}
                        </p>
                        <p className="text-sm text-slate-500">Cajero: {report.user_name}</p>
                        <p className="text-sm text-slate-400">
                            {new Date(report.opened_at).toLocaleString()} —{' '}
                            {report.closed_at
                                ? new Date(report.closed_at).toLocaleString()
                                : 'En curso'}
                        </p>
                    </div>
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${report.status === 'closed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                        {report.status === 'closed' ? (
                            <CheckCircle size={14} />
                        ) : (
                            <XCircle size={14} />
                        )}
                        {report.status === 'closed' ? 'Cerrada' : 'Abierta'}
                    </span>
                </div>

                {/* Totals Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Apertura"
                        value={`C$${openingAmount.toFixed(2)}`}
                        icon={DollarSign}
                    />
                    <StatCard
                        label="Ventas Totales"
                        value={`C$${parseFloat(report.sales_total).toFixed(2)}`}
                        icon={Receipt}
                    />
                    <StatCard
                        label="Ingresos"
                        value={`C$${parseFloat(report.income_total).toFixed(2)}`}
                        icon={TrendingUp}
                    />
                    <StatCard
                        label="Egresos"
                        value={`C$${parseFloat(report.expense_total).toFixed(2)}`}
                        icon={TrendingDown}
                    />
                </div>
            </Card>

            {/* Expected vs Counted */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                        Conciliación
                    </p>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Monto Esperado</span>
                            <span className="text-lg font-bold text-slate-800">
                                ${expectedAmount.toFixed(2)}
                            </span>
                        </div>
                        {countedAmount !== null && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Efectivo Contado</span>
                                    <span className="text-lg font-bold text-slate-800">
                                        ${countedAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-700">
                                        Diferencia
                                    </span>
                                    <span
                                        className={`text-xl font-bold ${difference === 0 ? 'text-emerald-600' : difference! > 0 ? 'text-blue-600' : 'text-rose-600'}`}
                                    >
                                        {difference !== null
                                            ? `${difference >= 0 ? '+' : ''}C$${difference.toFixed(2)}`
                                            : '—'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                <Card className="flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        Total Ventas
                    </p>
                    <p className="text-3xl font-bold text-brand mb-1">{report.sales_count}</p>
                    <p className="text-sm text-slate-400">ventas realizadas</p>
                    <p className="text-xs text-slate-400 mt-2">
                        {report.movements_count} movimientos
                    </p>
                </Card>
            </div>

            {/* Payment Methods Breakdown */}
            <Card>
                <p className="text-sm font-semibold text-slate-700 mb-4">
                    Desglose por Método de Pago
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {payments.map(({ type, label, icon: Icon, total }) => (
                        <div
                            key={type}
                            className="flex flex-col items-center p-4 bg-slate-50 rounded-xl"
                        >
                            <Icon size={22} className="text-slate-500 mb-2" />
                            <p className="text-lg font-bold text-slate-800">
                                ${parseFloat(total).toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">{label}</p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Notes */}
            {report.notes && (
                <Card>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Observaciones</p>
                    <p className="text-sm text-slate-600">{report.notes}</p>
                </Card>
            )}

            {/* Back Button */}
            <div className="flex justify-center">
                <Button variant="secondary" onClick={() => navigate('/cash-session')}>
                    <ArrowLeft size={15} /> Volver a Caja
                </Button>
            </div>
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    icon: React.FC<{ size?: number; className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
        <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-sm">
            <Icon size={18} className="text-brand" />
        </span>
        <div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-base font-bold text-slate-800">{value}</p>
        </div>
    </div>
);
