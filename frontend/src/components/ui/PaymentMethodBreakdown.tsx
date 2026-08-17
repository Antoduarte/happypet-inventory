import React from 'react';
import { Wallet, type LucideIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { PAYMENT_ICONS } from '../../utils/payment';

export interface PaymentBreakdownRow {
    type: string;
    label: string;
    total: string;
}

interface PaymentMethodBreakdownProps {
    data: PaymentBreakdownRow[];
    gridClassName?: string;
}

export const PaymentMethodBreakdown: React.FC<PaymentMethodBreakdownProps> = ({
    data,
    gridClassName = 'grid-cols-1 sm:grid-cols-4',
}) => {
    return (
        <div className={`grid gap-3 ${gridClassName}`}>
            {data.map((row) => {
                const Icon: LucideIcon = PAYMENT_ICONS[row.type] ?? Wallet;
                return (
                    <div
                        key={row.type}
                        className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-xl"
                    >
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                            <Icon size={24} />
                        </div>
                        <p className="text-base font-bold text-slate-800">
                            {formatCurrency(parseFloat(row.total))}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{row.label}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default PaymentMethodBreakdown;
