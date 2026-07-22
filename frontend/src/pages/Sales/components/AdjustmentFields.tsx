/**
 * AdjustmentFields
 *
 * Componente reutilizable que renderiza los campos de descuento/recargo
 * para un ítem o para la venta completa. Incluye:
 * - Selector de descuento (%) – mutuamente excluyente con recargo
 * - Selector de recargo (%)
 * - Campo de razón de recargo (visible sólo si surcharge > 0)
 */

import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { DISCOUNT_OPTIONS } from '../hooks/useSaleForm';

interface AdjustmentFieldsProps<T extends FieldValues> {
    control: Control<T>;
    discountName: FieldPath<T>;
    surchargeName: FieldPath<T>;
    surchargeReasonName: FieldPath<T>;
    watchedDiscount: number;
    watchedSurcharge: number;
    /** Si true, muestra el bloque en versión compacta (para uso en filas) */
    compact?: boolean;
}

export function AdjustmentFields<T extends FieldValues>({
    control,
    discountName,
    surchargeName,
    surchargeReasonName,
    watchedDiscount,
    watchedSurcharge,
    compact = false,
}: AdjustmentFieldsProps<T>) {
    const hasDiscount = watchedDiscount > 0;
    const hasSurcharge = watchedSurcharge > 0;

    const selectClass =
        'w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 outline-none transition-all';

    return (
        <div className={`flex flex-wrap gap-2 ${compact ? '' : 'pt-2'}`}>
            {/* Discount */}
            <div className="flex flex-col gap-1 min-w-[110px]">
                <label className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                    <TrendingDown size={10} />
                    Descuento
                </label>
                <Controller
                    name={discountName}
                    control={control}
                    render={({ field }) => (
                        <select
                            {...field}
                            disabled={hasSurcharge}
                            value={String(field.value)}
                            onChange={(e) => {
                                field.onChange(Number(e.target.value));
                            }}
                            className={`${selectClass} ${
                                hasDiscount
                                    ? 'border-emerald-300 text-emerald-700 font-medium'
                                    : hasSurcharge
                                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                                      : ''
                            }`}
                        >
                            {DISCOUNT_OPTIONS.map((v) => (
                                <option key={v} value={v}>
                                    {v === 0 ? 'Sin descuento' : `${v}% descuento`}
                                </option>
                            ))}
                        </select>
                    )}
                />
                {hasSurcharge && (
                    <span className="text-[9px] text-slate-400 italic">
                        No disponible con recargo
                    </span>
                )}
            </div>

            {/* Surcharge */}
            <div className="flex flex-col gap-1 min-w-[110px]">
                <label className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                    <TrendingUp size={10} />
                    Recargo
                </label>
                <Controller
                    name={surchargeName}
                    control={control}
                    render={({ field }) => (
                        <select
                            {...field}
                            disabled={hasDiscount}
                            value={String(field.value)}
                            onChange={(e) => {
                                field.onChange(Number(e.target.value));
                            }}
                            className={`${selectClass} ${
                                hasSurcharge
                                    ? 'border-amber-300 text-amber-700 font-medium'
                                    : hasDiscount
                                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                                      : ''
                            }`}
                        >
                            {DISCOUNT_OPTIONS.map((v) => (
                                <option key={v} value={v}>
                                    {v === 0 ? 'Sin recargo' : `+${v}%`}
                                </option>
                            ))}
                        </select>
                    )}
                />
                {hasDiscount && (
                    <span className="text-[9px] text-slate-400 italic">
                        No disponible con descuento
                    </span>
                )}
            </div>

            {/* Surcharge reason */}
            {hasSurcharge && (
                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        <Tag size={10} />
                        Razón del recargo
                    </label>
                    <Controller
                        name={surchargeReasonName}
                        control={control}
                        render={({ field }) => (
                            <input
                                {...field}
                                value={field.value ?? ''}
                                placeholder="Ej: urgencia, material especial..."
                                className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs placeholder:text-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300/20 outline-none transition-all"
                            />
                        )}
                    />
                </div>
            )}
        </div>
    );
}
