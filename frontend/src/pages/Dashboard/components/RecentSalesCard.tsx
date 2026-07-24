import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Banknote,
    CreditCard,
    ArrowLeftRight,
    QrCode,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { StatusBanner } from '../../../components/ui/StatusBanner';
import { useSale } from '../../../hooks/useSale';
import { formatCurrency } from '../../../utils/format';

const PAYMENT_ICONS: Record<string, LucideIcon> = {
    cash: Banknote,
    card: CreditCard,
    transfer: ArrowLeftRight,
    qr: QrCode,
    credit: Wallet,
};

const formatSaleDate = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString('es-NI', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const RecentSalesCard: React.FC = () => {
    const { sales, isLoading, fetchSales } = useSale();

    useEffect(() => {
        fetchSales({ ordering: '-sale_date', page_size: 6 });
    }, [fetchSales]);

    return (
        <Card title="Ventas recientes" className="lg:col-span-2">
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                </div>
            ) : sales.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No hay ventas recientes.</p>
            ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                    {sales.map((sale) => {
                        const Icon = PAYMENT_ICONS[sale.payment_type] ?? Wallet;
                        return (
                            <Link
                                key={sale.id}
                                to={`/sales/${sale.id}`}
                                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand/10 text-brand">
                                        <Icon size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">
                                            Venta #{sale.id}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatSaleDate(sale.sale_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-none items-center gap-3">
                                    <StatusBanner status={sale.status} />
                                    <span className="w-24 text-right text-sm font-bold tabular-nums text-slate-900">
                                        {formatCurrency(sale.total_price)}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};
