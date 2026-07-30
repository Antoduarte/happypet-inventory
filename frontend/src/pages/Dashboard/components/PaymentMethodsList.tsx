import React from 'react';
import {
    Banknote,
    CreditCard,
    ArrowLeftRight,
    QrCode,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import type { ReportPaymentRow } from '../../../interfaces/report';
import { formatCurrency } from '../../../utils/format';

const PAYMENT_ICONS: Record<string, LucideIcon> = {
    cash: Banknote,
    card: CreditCard,
    transfer: ArrowLeftRight,
    qr: QrCode,
};

interface PaymentMethodsListProps {
    data: ReportPaymentRow[];
}

export const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({ data }) => {
    const total = data.reduce((sum, row) => sum + parseFloat(row.total || '0'), 0);

    return (
        <div className="flex flex-col gap-8">
            {data
                .filter((row) => row.type !== 'credit')
                .map((row) => {
                    const Icon = PAYMENT_ICONS[row.type] ?? Wallet;
                    const amount = parseFloat(row.total || '0');
                    const pct = total > 0 ? (amount / total) * 100 : 0;

                    return (
                        <div key={row.type} className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand/10 text-brand">
                                        <Icon size={16} />
                                    </div>
                                    <span className="truncate text-sm font-medium text-slate-600">
                                        {row.label}
                                    </span>
                                </div>
                                <span className="flex-none text-sm font-bold tabular-nums text-slate-900">
                                    {formatCurrency(row.total)}
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-brand transition-all"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-semibold text-slate-500">Total</span>
                <span className="text-base font-bold tabular-nums text-slate-900">
                    {formatCurrency(total)}
                </span>
            </div>
        </div>
    );
};
