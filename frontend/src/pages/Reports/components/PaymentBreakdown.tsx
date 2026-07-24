import React from 'react';
import { ArrowLeftRight, Banknote, CreditCard, Wallet, type LucideIcon } from 'lucide-react';
import type { ReportPaymentRow } from '../../../interfaces/report';
import { formatCurrency } from '../../../utils/format';

interface PaymentBreakdownProps {
    data: ReportPaymentRow[];
}

const PAYMENT_ICONS: Record<string, LucideIcon> = {
    cash: Banknote,
    card: CreditCard,
    transfer: ArrowLeftRight,
};

export const PaymentBreakdown: React.FC<PaymentBreakdownProps> = ({ data }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.map((row) => {
                const Icon = PAYMENT_ICONS[row.type] ?? Wallet;
                return (
                    <div
                        key={row.type}
                        className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-xl"
                    >
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                            <Icon size={24} />
                        </div>
                        <p className="text-base font-bold text-slate-800">
                            {formatCurrency(row.total)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{row.label}</p>
                    </div>
                );
            })}
        </div>
    );
};
