import React from 'react';
import { DollarSign } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { PAYMENT_ICONS } from '../../../utils/payment';
import type { Sale } from '../../../interfaces/sale';

const PAYMENT_TYPES = ['cash', 'card', 'transfer', 'credit'] as const;

interface SalesBreakdownProps {
    sales: Sale[];
}

export const SalesBreakdown: React.FC<SalesBreakdownProps> = ({ sales }) => {
    return (
        <Card>
            <p className="text-sm font-semibold text-slate-700 mb-4">Ventas por Método de Pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAYMENT_TYPES.map((type) => {
                    const pureSales = sales.filter(
                        (s) => s.payment_type === type && s.status !== 'cancelled',
                    );
                    const mixedSales = sales.filter(
                        (s) => s.payment_type === 'mixed' && s.status !== 'cancelled',
                    );
                    const mixedTotal = mixedSales.reduce((sum, s) => {
                        const entry = s.payment_split?.find((p) => p.method === type);
                        return sum + (entry ? parseFloat(String(entry.amount)) : 0);
                    }, 0);
                    const total =
                        pureSales.reduce((sum, s) => sum + parseFloat(s.total_price || '0'), 0) +
                        mixedTotal;
                    const mixedCount = mixedSales.filter((s) =>
                        s.payment_split?.some((p) => p.method === type),
                    ).length;
                    const count = pureSales.length + mixedCount;
                    const Icon = PAYMENT_ICONS[type] ?? DollarSign;
                    return (
                        <div
                            key={type}
                            className="flex flex-col items-center p-3 bg-slate-50 rounded-xl"
                        >
                            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                <Icon size={22} />
                            </div>
                            <p className="text-lg font-bold text-slate-800">C${total.toFixed(2)}</p>
                            <p className="text-xs text-slate-400">
                                {count} venta{count !== 1 ? 's' : ''}
                            </p>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
