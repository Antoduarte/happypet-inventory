import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuth } from '../../hooks/useAuth';

const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ElementType;
    trend?: string;
    trendUp?: boolean;
    isLoading?: boolean;
}> = ({ title, value, icon: Icon, trend, trendUp, isLoading }) => (
    <Card className="flex flex-col">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
                <Icon size={24} />
            </div>
            {trend && (
                <div
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                >
                    {trendUp ? '+' : ''}
                    {trend}
                </div>
            )}
        </div>
        <div className="mt-auto">
            <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
            {isLoading ? (
                <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mt-1" />
            ) : (
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            )}
        </div>
    </Card>
);

const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `C$ ${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { stats, isLoading, fetchStats } = useDashboard();
    const { user } = useAuth();

    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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
        <div>
            <PageHeader title="Resumen" breadcrumbs={[{ label: 'Panel' }]} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                    title="Total de Productos"
                    value={stats?.total_products?.toLocaleString('es-NI') ?? '0'}
                    icon={Package}
                    trendUp={true}
                    isLoading={isLoading}
                />
                <StatCard
                    title="Ingresos de Hoy"
                    value={stats ? formatCurrency(stats.today_income) : 'C$ 0.00'}
                    icon={TrendingUp}
                    trendUp={true}
                    isLoading={isLoading}
                />
                <StatCard
                    title="Alertas de Bajo Stock"
                    value={`${stats?.low_stock_count ?? 0} artículos`}
                    icon={AlertTriangle}
                    trendUp={false}
                    isLoading={isLoading}
                />
                <StatCard
                    title="Servicios Realizados"
                    value={stats?.today_services?.toLocaleString('es-NI') ?? '0'}
                    icon={Users}
                    trendUp={true}
                    isLoading={isLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Actividad Reciente" className="lg:col-span-2">
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
                                        USR
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">
                                            Nueva Venta Registrada
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Pedido #ORD-500{i} • Por Usuario Administrador
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-slate-700">C$249.00</div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Acciones Rápidas">
                    <div className="flex flex-col gap-3">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.onClick}
                                className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 transition-colors border border-slate-200"
                            >
                                {action.label}
                            </button>
                        ))}
                        {!user?.hasCashSession && (
                            <p className="text-xs text-amber-600 mt-1 px-1">
                                Abre una caja para registrar ventas
                            </p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
