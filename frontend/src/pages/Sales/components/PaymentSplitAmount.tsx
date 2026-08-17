import { Banknote } from 'lucide-react';
import { PAYMENT_OPTIONS } from '@/utils/sales';
import type { PaymentMethod } from '@/interfaces/sale';

interface PaymentSplitAmountProps {
    watchedPaymentSplit: any;
    handleSplitAmountChange: (method: PaymentMethod, amount: string) => void;
    remainingAmount: number;
    isSplitValid: boolean;
}

export const PaymentSplitAmount = ({
    watchedPaymentSplit,
    handleSplitAmountChange,
    remainingAmount,
    isSplitValid,
}: PaymentSplitAmountProps) => {
    return (
        <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500">Desglose del pago</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {watchedPaymentSplit.map((entry: any) => {
                    const option = PAYMENT_OPTIONS.find((o) => o.value === entry.method);
                    const Icon = option?.icon ?? Banknote;
                    return (
                        <div
                            key={entry.method}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                            <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600">
                                <Icon size={14} aria-hidden />
                            </span>
                            <div className="flex-1 min-w-0">
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    {option?.label ?? entry.method}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                        C$
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={entry.amount}
                                        onChange={(e) =>
                                            handleSplitAmountChange(entry.method, e.target.value)
                                        }
                                        className="w-full pl-5 pr-1 py-0.5 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div
                className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${
                    !isSplitValid
                        ? 'border-red-200 text-red-600'
                        : 'border-slate-200 text-slate-500'
                }`}
            >
                <span>Restante</span>
                <span className="font-semibold">C${remainingAmount.toFixed(2)}</span>
            </div>
        </div>
    );
};
