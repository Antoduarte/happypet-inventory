/**
 * SaleProductRow
 *
 * Fila completa para un ítem de tipo PRODUCTO dentro de la venta.
 * Soporta:
 * - Selector de producto (filtrado por stock > 0)
 * - Selector de presentación (opcional) — carga las presentaciones del producto elegido
 * - Cantidad editable (decimal para fracciones si no hay presentación)
 * - Precio unitario auto-llenado desde la presentación o el producto base
 * - Descuento / Recargo por línea
 * - Subtotal calculado
 * - Precio final ajustado
 */

import React, { useEffect, useState } from 'react';
import { Controller, type UseFormSetValue, type Control } from 'react-hook-form';
import { Trash2, Package, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { Product, ProductPresentation } from '../../../interfaces/product';
import { AdjustmentFields } from './AdjustmentFields';
import { SearchableCombobox, type ComboboxOption } from './SearchableCombobox';
import { calcAdjustedTotal, type SaleFormData } from '../hooks/useSaleForm';
import { presentationService } from '../../../services/presentation';
import { formatStock } from '../../../utils/formatStock';

interface SaleProductRowProps {
    index: number;
    control: Control<SaleFormData>;
    setValue: UseFormSetValue<SaleFormData>;
    products: Product[];
    watchedItem: any;
    onRemove: () => void;
    canRemove: boolean;
}

export const SaleProductRow: React.FC<SaleProductRowProps> = ({
    index,
    control,
    setValue,
    products,
    watchedItem,
    onRemove,
    canRemove,
}) => {
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [presentations, setPresentations] = useState<ProductPresentation[]>([]);
    const [loadingPresentations, setLoadingPresentations] = useState(false);

    const subtotal = Number(watchedItem?.subtotal) || 0;
    const discountPct = Number(watchedItem?.discount_percentage) || 0;
    const surchargePct = Number(watchedItem?.surcharge_percentage) || 0;
    const finalPrice = calcAdjustedTotal(subtotal, discountPct, surchargePct);
    const hasAdjustment = discountPct > 0 || surchargePct > 0;
    const selectedProductId = Number(watchedItem?.productId) || null;
    const selectedPresentationId = Number(watchedItem?.presentationId) || null;

    // Load presentations when product changes
    useEffect(() => {
        if (!selectedProductId) {
            setPresentations([]);
            return;
        }
        setLoadingPresentations(true);
        presentationService
            .getPresentations({ product: selectedProductId, is_active: true, page_size: 50 })
            .then((r) => setPresentations(r.results || []))
            .catch(() => setPresentations([]))
            .finally(() => setLoadingPresentations(false));
    }, [selectedProductId]);

    /** When a product is selected: reset presentation + set base price */
    const handleProductChange = (id: number | null) => {
        // Clear previous presentation
        setValue(`items.${index}.presentationId` as any, null);

        const product = products.find((p) => p.id === id);
        if (!product) return;
        const qty = Number(watchedItem?.quantity) || 1;
        const price = parseFloat(product.price);
        setValue(`items.${index}.unitPrice`, price);
        setValue(`items.${index}.subtotal`, price * qty);
    };

    /** When a presentation is selected: update unit price from presentation price */
    const handlePresentationChange = (presentationId: number | null) => {
        if (!presentationId) {
            // Revert to product base price
            const product = products.find((p) => p.id === selectedProductId);
            if (product) {
                const qty = Number(watchedItem?.quantity) || 1;
                const price = parseFloat(product.price);
                setValue(`items.${index}.unitPrice`, price);
                setValue(`items.${index}.subtotal`, price * qty);
            }
            return;
        }
        const pres = presentations.find((p) => p.id === presentationId);
        if (!pres) return;
        const qty = Number(watchedItem?.quantity) || 1;
        const price = parseFloat(pres.price);
        setValue(`items.${index}.unitPrice`, price);
        setValue(`items.${index}.subtotal`, price * qty);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
            {/* Row header badge */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 rounded-full px-2.5 py-0.5">
                    <Package size={10} />
                    Producto
                </span>
                <span className="text-[10px] text-slate-400 ml-auto">#{index + 1}</span>
            </div>

            {/* Main fields */}
            <div className="flex flex-col sm:flex-row gap-3 items-end px-4 py-2">
                {/* Product selector */}
                <div className="w-full sm:flex-[2] flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Producto *</label>
                    <Controller
                        name={`items.${index}.productId` as const}
                        control={control}
                        render={({ field, fieldState }) => {
                            const productOptions: ComboboxOption[] = products
                                .filter((p) => p.is_sale_product)
                                .map((p) => ({
                                id: p.id,
                                label: p.name,
                                badge: `${formatStock(p.stock)} ${p.base_unit}`,
                                badgeVariant:
                                    parseFloat(p.stock) === 0
                                        ? 'error'
                                        : parseFloat(p.stock) <= 5
                                          ? 'warning'
                                          : 'success',
                                disabled: parseFloat(p.stock) === 0,
                            }));
                            return (
                                <SearchableCombobox
                                    options={productOptions}
                                    value={field.value || null}
                                    onChange={(id) => {
                                        field.onChange(id);
                                        handleProductChange(id);
                                    }}
                                    placeholder="Buscar producto..."
                                    error={fieldState.error?.message}
                                    accent="indigo"
                                />
                            );
                        }}
                    />
                </div>

                {/* Presentation selector (only when product has presentations) */}
                {selectedProductId && (
                    <div className="w-full sm:flex-[1.5] flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Layers size={10} />
                            Presentación
                            {loadingPresentations && (
                                <span className="text-[9px] text-slate-400 animate-pulse ml-1">
                                    cargando…
                                </span>
                            )}
                        </label>
                        <Controller
                            name={`items.${index}.presentationId` as any}
                            control={control}
                            render={({ field }) => {
                                const presOptions: ComboboxOption[] = [
                                    { id: 0, label: 'Sin presentación (unidad base)' },
                                    ...presentations.map((p) => ({
                                        id: p.id,
                                        label: p.name,
                                    })),
                                ];
                                return (
                                    <SearchableCombobox
                                        options={presOptions}
                                        value={field.value || 0}
                                        onChange={(id) => {
                                            const finalId = id === 0 ? null : id;
                                            field.onChange(finalId);
                                            handlePresentationChange(finalId);
                                        }}
                                        placeholder={
                                            loadingPresentations
                                                ? 'Cargando…'
                                                : presentations.length === 0
                                                  ? 'Sin presentaciones'
                                                  : 'Seleccionar…'
                                        }
                                        accent="violet"
                                        disabled={presentations.length === 0}
                                    />
                                );
                            }}
                        />
                    </div>
                )}

                {/* Quantity */}
                <div className="flex flex-col gap-1 w-24">
                    <label className="text-xs font-medium text-slate-500">Cant.</label>
                    <Controller
                        name={`items.${index}.quantity` as const}
                        control={control}
                        render={({ field, fieldState }) => (
                            <>
                                <input
                                    {...field}
                                    type="number"
                                    min={0.0001}
                                    step={selectedPresentationId ? 1 : 0.01}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm text-center outline-none transition-all ${fieldState.error ? 'border-red-300' : 'border-slate-300 focus:border-brand-light focus:ring-1 focus:ring-brand-light/10'}`}
                                />
                                {fieldState.error && (
                                    <span className="text-[11px] text-red-500">
                                        {fieldState.error.message}
                                    </span>
                                )}
                            </>
                        )}
                    />
                </div>

                {/* Unit price */}
                <div className="flex flex-col gap-1 w-28">
                    <label className="text-xs font-medium text-slate-500">Precio unit.</label>
                    <Controller
                        name={`items.${index}.unitPrice` as const}
                        control={control}
                        render={({ field }) => (
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 mr-4 text-xs">
                                    C$
                                </span>
                                <input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    readOnly
                                    className="w-full pl-6 pr-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-sm outline-none cursor-not-allowed"
                                />
                            </div>
                        )}
                    />
                </div>

                {/* Subtotal display */}
                <div className="flex flex-col gap-1 w-32">
                    <label className="text-xs font-medium text-slate-500">
                        {hasAdjustment ? 'Ajustado' : 'Subtotal'}
                    </label>
                    <div className="flex flex-col">
                        {hasAdjustment && (
                            <span className="text-[10px] text-slate-400 line-through px-3">
                                C${subtotal.toFixed(0)}
                            </span>
                        )}
                        <div
                            className={`px-3 py-2 rounded-lg text-sm font-semibold h-[38px] flex items-center ${
                                discountPct > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : surchargePct > 0
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}
                        >
                            C${finalPrice.toFixed(0)}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mb-[1px]">
                    <button
                        type="button"
                        onClick={() => setShowAdjustments((v) => !v)}
                        title="Ajustes de precio"
                        className={`p-2 rounded-lg transition-colors text-sm ${
                            hasAdjustment
                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {showAdjustments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={!canRemove}
                        title="Eliminar producto"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Adjustment panel */}
            {showAdjustments && (
                <div className="px-4 pb-3 pt-1 border-t border-dashed border-slate-100 bg-slate-50/60">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Ajustes de precio para este producto
                    </p>
                    <AdjustmentFields
                        control={control}
                        discountName={`items.${index}.discount_percentage` as any}
                        surchargeName={`items.${index}.surcharge_percentage` as any}
                        surchargeReasonName={`items.${index}.surcharge_reason` as any}
                        watchedDiscount={discountPct}
                        watchedSurcharge={surchargePct}
                        compact
                    />
                </div>
            )}
        </div>
    );
};
