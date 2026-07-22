import React from 'react';
import { Trash2 } from 'lucide-react';
import { SearchableCombobox, type ComboboxOption } from '../../Sales/components/SearchableCombobox';

export interface LineItem {
    product_id: number | null;
    presentation_id: number | null;
    quantity: number;
}

export interface LineItemRowProps {
    item: LineItem;
    productOptions: ComboboxOption[];
    presentationOptions: { id: number; name: string; multiplier: string }[];
    isLoadingPresentations: boolean;
    onProductChange: (id: number) => void;
    onPresentationChange: (id: number | null) => void;
    onQuantityChange: (qty: number) => void;
    onRemove?: () => void;
    baseUnit: string;
}

export const LineItemRow: React.FC<LineItemRowProps> = ({
    item,
    productOptions,
    presentationOptions,
    isLoadingPresentations,
    onProductChange,
    onPresentationChange,
    onQuantityChange,
    onRemove,
    baseUnit,
}) => (
    <div className="px-4 py-3 grid grid-cols-[1fr_1fr_100px_40px] gap-3 items-end bg-white">
        <div className="flex flex-col gap-0.5">
            <SearchableCombobox
                options={productOptions}
                value={item.product_id}
                onChange={onProductChange}
                placeholder="Seleccionar..."
                label=""
                error=""
            />
        </div>

        <div className="flex flex-col gap-0.5">
            {item.product_id ? (
                isLoadingPresentations ? (
                    <div className="h-[38px] flex items-center px-3 text-xs text-slate-400 border border-slate-200 rounded-lg bg-slate-50">
                        Cargando...
                    </div>
                ) : presentationOptions.length > 0 ? (
                    <select
                        value={item.presentation_id ?? ''}
                        onChange={(e) =>
                            onPresentationChange(e.target.value ? Number(e.target.value) : null)
                        }
                        className="form-select w-full px-3 py-[7px] bg-white border border-slate-300 rounded-lg text-xs focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none hover:border-slate-400"
                    >
                        <option value="">Unidad Base ({baseUnit})</option>
                        {presentationOptions.map((pres) => (
                            <option key={pres.id} value={pres.id}>
                                {pres.name} (×{pres.multiplier} {baseUnit})
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="h-[38px] flex items-center px-3 text-xs text-slate-400 border border-slate-200 rounded-lg bg-slate-50">
                        Sin presentaciones
                    </div>
                )
            ) : (
                <div className="h-[38px] flex items-center px-3 text-xs text-slate-400 border border-slate-200 rounded-lg bg-slate-50">
                    —
                </div>
            )}
        </div>

        <div className="flex flex-col gap-0.5">
            <input
                type="number"
                value={item.quantity}
                min="0.0001"
                step="any"
                onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-[7px] bg-white border border-slate-300 rounded-lg text-xs text-right focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none hover:border-slate-400"
            />
        </div>

        <div className="flex justify-center pb-0.5">
            {onRemove ? (
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar ítem"
                >
                    <Trash2 size={14} />
                </button>
            ) : (
                <div className="w-7" />
            )}
        </div>
    </div>
);
