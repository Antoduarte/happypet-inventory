import React from 'react';
import { DollarSign, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { Sale } from '../../../interfaces/sale';

const PAYMENT_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
    cash: Banknote,
    card: CreditCard,
    transfer: ArrowLeftRight,
};

interface SalesBreakdownProps {
    sales: Sale[];
}

export const SalesBreakdown: React.FC<SalesBreakdownProps> = ({ sales }) => {
    return (
        <Card>
            <p className="text-sm font-semibold text-slate-700 mb-4">Ventas por Método de Pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {['cash', 'card', 'transfer'].map((type) => {
                    const typeSales = sales.filter((s) => s.payment_type === type);
                    const total = typeSales.reduce(
                        (sum, s) => sum + parseFloat(s.total_price || '0'),
                        0,
                    );
                    const count = typeSales.length;
                    const Icon = PAYMENT_ICONS[type] || DollarSign;
                    return (
                        <div
                            key={type}
                            className="flex flex-col items-center p-3 bg-slate-50 rounded-xl"
                        >
                            <Icon size={20} className="text-slate-500 mb-1" />
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
