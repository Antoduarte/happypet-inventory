import React from 'react';
import { DollarSign, Percent, Receipt } from 'lucide-react';
import type { Sale } from '../../interfaces/sale';
import { Card } from './Card';

interface FinancialSummaryCardProps {
    sale: Sale;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ sale }) => {
    const discountLabel =
        sale.discount_percentage > 0
            ? `Descuento ${sale.discount_percentage}%`
            : sale.surcharge_percentage > 0
              ? `Recargo ${sale.surcharge_percentage}%`
              : null;
    const discountValue =
        sale.discount_percentage > 0
            ? `C$${(parseFloat(sale.subtotal) * (sale.discount_percentage / 100)).toFixed(2)}`
            : sale.surcharge_percentage > 0
              ? `C$${(parseFloat(sale.subtotal) * (sale.surcharge_percentage / 100)).toFixed(2)}`
              : null;
    const surchargeValue =
        sale.surcharge_percentage > 0
            ? `C$${(parseFloat(sale.subtotal) * (sale.surcharge_percentage / 100)).toFixed(2)}`
            : null;

    return (
        <Card title="Resumen Financiero" className="mt-5">
            <div className="space-y-3">
                {/* Subtotal row */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2">
                        <Receipt size={14} className="text-slate-400" />
                        Subtotal
                    </span>
                    <span className="font-medium text-slate-700">
                        C${parseFloat(sale.subtotal).toFixed(2)}
                    </span>
                </div>

                {/* Discount row */}
                {discountValue && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-emerald-600 flex items-center gap-2">
                            <Percent size={14} className="text-emerald-500" />
                            {discountLabel}
                        </span>
                        <span className="font-medium text-emerald-600">-{discountValue}</span>
                    </div>
                )}

                {/* Surcharge row */}
                {surchargeValue && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-amber-600 flex items-center gap-2">
                            <Percent size={14} className="text-amber-500" />
                            Recargo ({sale.surcharge_percentage}%)
                        </span>
                        <span className="font-medium text-amber-600">+{surchargeValue}</span>
                    </div>
                )}

                {/* Surcharge reason */}
                {sale.surcharge_reason && (
                    <p className="text-xs text-amber-500 italic pl-6">{sale.surcharge_reason}</p>
                )}

                {/* Divider */}
                {discountValue || surchargeValue ? (
                    <div className="border-t border-slate-100" />
                ) : null}

                {/* Total row — always prominent */}
                <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <DollarSign size={16} className="text-brand" />
                        Total
                    </span>
                    <span className="text-2xl font-bold text-brand">
                        C${parseFloat(sale.total_price).toFixed(2)}
                    </span>
                </div>

                {/* Stats row */}
                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100">
                    <span>
                        {sale.quantity} artículo{sale.quantity !== 1 ? 's' : ''}
                    </span>
                    <span>
                        {sale.items.length} línea{sale.items.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </Card>
    );
};
