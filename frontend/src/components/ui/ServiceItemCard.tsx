import React from 'react';
import { Wrench, Package } from 'lucide-react';
import type { SaleItem } from '../../interfaces/sale';

interface ServiceItemCardProps {
    item: SaleItem;
    supplies: SaleItem[];
}

export const ServiceItemCard: React.FC<ServiceItemCardProps> = ({ item, supplies }) => {
    const name = item.service?.name ?? '—';
    const presentation = item.presentation_name;
    const qty = parseFloat(item.quantity);
    const unitPrice = parseFloat(item.price_per_item);
    const total = parseFloat(item.total_price);
    const discount = item.discount_percentage;

    return (
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mb-3">
            {/* Service row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100">
                        <Wrench size={18} className="text-violet-600" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                            {name}
                            {presentation ? ` (${presentation})` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                            {qty.toFixed(2)} × C${unitPrice.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-800">C${total.toFixed(2)}</p>
                    <div className="flex flex-col items-end gap-1">
                        {discount > 0 && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                -{discount}%
                            </span>
                        )}
                        {item.surcharge_percentage > 0 && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                +{item.surcharge_percentage}%
                            </span>
                        )}
                    </div>
                    {item.surcharge_reason && item.surcharge_percentage > 0 && (
                        <p className="text-xs text-amber-500 italic mt-1">
                            {item.surcharge_reason}
                        </p>
                    )}
                </div>
            </div>

            {/* Supplies nested list */}
            {supplies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-violet-100">
                    <p className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-2">
                        Insumos incluidos:
                    </p>
                    <ul className="border-l-2 border-violet-200 pl-4 space-y-1.5">
                        {supplies.map((supply) => {
                            const supplyName = supply.product?.name ?? '—';
                            const supplyPresentation = supply.presentation_name;
                            const supplyQty = parseFloat(supply.quantity);
                            return (
                                <li
                                    key={supply.id}
                                    className="flex items-center justify-between text-sm text-slate-600"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Package size={12} className="shrink-0 text-slate-400" />
                                        <span className="truncate">
                                            {supplyName}
                                            {supplyPresentation
                                                ? ` (${supplyPresentation})`
                                                : ''} × {supplyQty.toFixed(0)}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400 shrink-0 ml-4">
                                        Incluido
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
