import React from 'react';
import { Package } from 'lucide-react';
import type { SaleItem } from '../../interfaces/sale';

interface ProductItemCardProps {
    item: SaleItem;
}

export const ProductItemCard: React.FC<ProductItemCardProps> = ({ item }) => {
    const name = item.product?.name ?? '—';
    const presentation = item.presentation_name;
    const qty = parseFloat(item.quantity);
    const unitPrice = parseFloat(item.price_per_item);
    const total = parseFloat(item.total_price);
    const discount = item.discount_percentage;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-50">
                        <Package size={18} className="text-slate-500" />
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
        </div>
    );
};
