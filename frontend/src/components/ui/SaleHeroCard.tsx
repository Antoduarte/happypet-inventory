import React from 'react';
import { Receipt } from 'lucide-react';
import type { Sale } from '../../interfaces/sale';
import { Card } from './Card';
import { StatusBanner } from './StatusBanner';
import { PAYMENT_LABELS, PAYMENT_ICONS } from '../../utils/payment';

interface SaleHeroCardProps {
    sale: Sale;
}

export const SaleHeroCard: React.FC<SaleHeroCardProps> = ({ sale }) => {
    const paymentIcon = () => {
        const Icon = PAYMENT_ICONS[sale.payment_type];
        if (!Icon) {
            return null;
        }
        return <Icon size={18} className="text-brand" />;
    };

    return (
        <Card className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left: ID + Date + Payment */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-700">
                        <Receipt size={16} className="text-slate-400" />
                        <span className="font-bold text-lg">Venta #{sale.id}</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="text-sm text-slate-500">
                        {new Date(sale.sale_date).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                    {sale.paid_at && (
                        <>
                            <span className="text-slate-300">•</span>
                            <div className="text-sm text-emerald-600">
                                Cobrado:{' '}
                                {new Date(sale.paid_at).toLocaleString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </>
                    )}
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        {paymentIcon()}
                        <span className="font-medium">
                            {PAYMENT_LABELS[sale.payment_type] ?? sale.payment_type}
                        </span>
                    </div>
                </div>

                {/* Right: Status badge */}
                <StatusBanner status={sale.status} />
            </div>
        </Card>
    );
};
