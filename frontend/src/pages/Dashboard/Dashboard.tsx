import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertTriangle, Scissors } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useDashboard } from '../../hooks/useDashboard';
import { useReports } from '../../hooks/useReports';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/format';
import { SalesTrendChart } from '../Reports/components/SalesTrendChart';
import { KpiCard } from './components/KpiCard';
import { PaymentMethodsList } from './components/PaymentMethodsList';
import { RecentSalesCard } from './components/RecentSalesCard';
import { CashStatusCard } from './components/CashStatusCard';

/** Builds a YYYY-MM-DD string from local date parts (avoids UTC shift). */
const toISODate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { stats, isLoading, fetchStats } = useDashboard();
    const { report, isLoading: reportLoading, fetchReport } = useReports();
    const { user } = useAuth();

    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const range = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        return { start: toISODate(start), end: toISODate(end) };
    }, []);

    useEffect(() => {
        if (isAdminOrManager) {
            fetchReport({ start: range.start, end: range.end, granularity: 'day' });
        }
    }, [isAdminOrManager, range, fetchReport]);

    const lowStock = stats?.low_stock_count ?? 0;

    const quickActions = [
        {
            label: '+ Registrar Nueva Venta',
            onClick: () => navigate('/sales/new'),
            show: Boolean(user?.hasCashSession),
        },
        {
            label: '+ Nuevo Producto',
            onClick: () => navigate('/products/new'),
            show: isAdminOrManager,
        },
        {
            label: '+ Nuevo Servicio',
            onClick: () => navigate('/services/new'),
            show: isAdminOrManager,
        },
        {
            label: '+ Nuevo Movimiento',
            onClick: () => navigate('/movements/new'),
            show: isAdminOrManager,
        },
        {
            label: '+ Nuevo Usuario',
            onClick: () => navigate('/users/new'),
            show: isAdmin,
        },
    ].filter((action) => action.show);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Ingresos de hoy"
                    value={stats ? formatCurrency(stats.today_income) : 'C$ 0.00'}
                    icon={TrendingUp}
                    accent="brand"
                    subtitle="Al día de hoy"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Productos"
                    value={stats?.total_products?.toLocaleString('es-NI') ?? '0'}
                    icon={Package}
                    accent="slate"
                    subtitle="Ver productos →"
                    to="/products"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Servicios de hoy"
                    value={stats?.today_services?.toLocaleString('es-NI') ?? '0'}
                    icon={Scissors}
                    accent="emerald"
                    subtitle="Realizados hoy"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Stock bajo"
                    value={`${lowStock} ${lowStock === 1 ? 'artículo' : 'artículos'}`}
                    icon={AlertTriangle}
                    accent="amber"
                    subtitle="Revisar en Productos →"
                    to="/products"
                    isLoading={isLoading}
                    highlight={lowStock > 0}
                />
            </div>

            {isAdminOrManager && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card
                        title="Ventas — últimos 7 días"
                        className="lg:col-span-2"
                        action={
                            report && !reportLoading ? (
                                <span className="text-xs font-normal text-slate-400">
                                    Total {formatCurrency(report.summary.total_income)}
                                </span>
                            ) : undefined
                        }
                    >
                        {reportLoading ? (
                            <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
                        ) : (
                            <SalesTrendChart data={report?.by_period ?? []} granularity="day" />
                        )}
                    </Card>

                    <Card title="Métodos de pago">
                        {reportLoading ? (
                            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
                        ) : report && report.by_payment.length > 0 ? (
                            <PaymentMethodsList data={report.by_payment} />
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-400">
                                Sin datos de pago en el período.
                            </p>
                        )}
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <RecentSalesCard />

                <div className="flex flex-col gap-6">
                    <CashStatusCard />

                    <Card title="Acciones Rápidas">
                        <div className="flex flex-col gap-3">
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.onClick}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-brand-muted hover:bg-brand/5 hover:text-brand"
                                >
                                    {action.label}
                                </button>
                            ))}
                            {!user?.hasCashSession && (
                                <p className="mt-1 px-1 text-xs text-amber-600">
                                    Abre una caja para registrar ventas
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
