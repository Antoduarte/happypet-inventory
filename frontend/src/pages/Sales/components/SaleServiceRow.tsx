/**
 * SaleServiceRow
 *
 * Fila completa para un ítem de tipo SERVICIO dentro de la venta.
 * Soporta:
 * - Selector de servicio
 * - Cantidad, precio unitario auto-llenado
 * - Descuento / Recargo por línea
 * - Sub-panel de INSUMOS: productos consumidos durante el servicio
 *   (ej: medicamentos, materiales, insumos quirúrgicos)
 * - Cada insumo tiene su propio producto, cantidad y precio
 */

import React, { useState } from 'react';
import { Controller, useFieldArray, type Control, type UseFormSetValue } from 'react-hook-form';
import {
    Trash2,
    Wrench,
    ChevronDown,
    ChevronUp,
    Plus,
    Boxes,
    PackagePlus,
    Layers,
} from 'lucide-react';
import type { Service } from '../../../interfaces/service';
import type { Product, ProductPresentation } from '../../../interfaces/product';
import { AdjustmentFields } from './AdjustmentFields';
import { SearchableCombobox, type ComboboxOption } from './SearchableCombobox';
import {
    calcAdjustedTotal,
    applyProductPrice,
    defaultSupply,
    type SaleFormData,
} from '../hooks/useSaleForm';
import { presentationService } from '../../../services/presentation';
import { formatStock } from '../../../utils/formatStock';

interface SaleServiceRowProps {
    index: number;
    control: Control<SaleFormData>;
    setValue: UseFormSetValue<SaleFormData>;
    services: Service[];
    products: Product[];
    watchedItem: any;
    onRemove: () => void;
    canRemove: boolean;
}

export const SaleServiceRow: React.FC<SaleServiceRowProps> = ({
    index,
    control,
    setValue,
    services,
    products,
    watchedItem,
    onRemove,
    canRemove,
}) => {
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [showSupplies, setShowSupplies] = useState(false);
    const [supplyPresentations, setSupplyPresentations] = useState<
        Map<number, ProductPresentation[]>
    >(new Map());
    const [loadingSupplyPres, setLoadingSupplyPres] = useState(false);

    const suppliesArray = useFieldArray({
        control,
        name: `items.${index}.supplies` as any,
    });

    const subtotal = Number(watchedItem?.subtotal) || 0;
    const discountPct = Number(watchedItem?.discount_percentage) || 0;
    const surchargePct = Number(watchedItem?.surcharge_percentage) || 0;
    const finalPrice = calcAdjustedTotal(subtotal, discountPct, surchargePct);
    const hasAdjustment = discountPct > 0 || surchargePct > 0;
    const suppliesCount = (watchedItem?.supplies ?? []).length;

    /** Carga las presentaciones para un insumo cuando cambia el producto */
    const loadSupplyPresentations = async (productId: number, supplyIdx: number) => {
        if (!productId) {
            setSupplyPresentations((prev) => {
                const n = new Map(prev);
                n.delete(supplyIdx);
                return n;
            });
            return;
        }
        setLoadingSupplyPres(true);
        try {
            const r = await presentationService.getPresentations({
                product: productId,
                is_active: true,
                page_size: 50,
            });
            setSupplyPresentations((prev) => {
                const n = new Map(prev);
                n.set(supplyIdx, r.results || []);
                return n;
            });
        } catch {
            setSupplyPresentations((prev) => {
                const n = new Map(prev);
                n.delete(supplyIdx);
                return n;
            });
        } finally {
            setLoadingSupplyPres(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-violet-200 shadow-sm transition-all duration-200 hover:border-violet-300 hover:shadow-md">
            {/* Row header badge */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600 uppercase tracking-widest bg-violet-50 rounded-full px-2.5 py-0.5">
                    <Wrench size={10} />
                    Servicio
                </span>
                {suppliesCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                        <Boxes size={9} />
                        {suppliesCount} insumo{suppliesCount !== 1 ? 's' : ''}
                    </span>
                )}
                <span className="text-[10px] text-slate-400 ml-auto">#{index + 1}</span>
            </div>

            {/* Main fields */}
            <div className="flex flex-col sm:flex-row gap-3 items-end px-4 py-2">
                {/* Service selector */}
                <div className="w-full sm:flex-[2] flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Servicio *</label>
                    <Controller
                        name={`items.${index}.serviceId` as any}
                        control={control}
                        render={({ field, fieldState }) => {
                            const serviceOptions: ComboboxOption[] = services
                                .filter((s) => s.is_active)
                                .map((s) => ({
                                    id: s.id,
                                    label: s.name,
                                    badge: `C$${s.price}`,
                                    badgeVariant: 'neutral' as const,
                                }));
                            return (
                                <SearchableCombobox
                                    options={serviceOptions}
                                    value={field.value || null}
                                    onChange={(id) => {
                                        field.onChange(id);
                                        const svc = services.find((s) => s.id === id);
                                        if (svc) {
                                            const price = parseFloat(svc.price);
                                            setValue(`items.${index}.unitPrice` as any, price);
                                            setValue(`items.${index}.subtotal` as any, price);
                                        }
                                    }}
                                    placeholder="Buscar servicio..."
                                    error={fieldState.error?.message}
                                    accent="violet"
                                />
                            );
                        }}
                    />
                </div>

                {/* Unit price */}
                <div className="flex flex-col gap-1 w-28">
                    <label className="text-xs font-medium text-slate-500">Precio unit.</label>
                    <Controller
                        name={`items.${index}.unitPrice` as any}
                        control={control}
                        render={({ field }) => (
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                    $
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
                                      : 'bg-violet-50 text-violet-700 border border-violet-200'
                            }`}
                        >
                            C${finalPrice.toFixed(0)}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mb-[1px]">
                    {/* Toggle insumos */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowSupplies((v) => !v);
                            if (!showSupplies) setShowAdjustments(false);
                        }}
                        title="Insumos del servicio"
                        className={`p-2 rounded-lg transition-colors text-sm ${
                            suppliesCount > 0
                                ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                                : 'text-slate-400 hover:text-violet-500 hover:bg-violet-50'
                        }`}
                    >
                        <PackagePlus size={16} />
                    </button>
                    {/* Toggle ajustes */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowAdjustments((v) => !v);
                            if (!showAdjustments) setShowSupplies(false);
                        }}
                        title="Ajustes de precio"
                        className={`p-2 rounded-lg transition-colors text-sm ${
                            hasAdjustment
                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {showAdjustments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {/* Remove */}
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={!canRemove}
                        title="Eliminar servicio"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* ── Adjustment panel ── */}
            {showAdjustments && (
                <div className="px-4 pb-3 pt-1 border-t border-dashed border-slate-100 bg-slate-50/60">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Ajustes de precio para este servicio
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

            {/* ── Supplies panel ── */}
            {showSupplies && (
                <div className="px-4 pb-4 pt-2 border-t border-dashed border-violet-100 bg-violet-50/40">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                            <Boxes size={11} />
                            Insumos / Productos utilizados en este servicio
                        </p>
                        <button
                            type="button"
                            onClick={() => suppliesArray.append(defaultSupply())}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 bg-violet-100 hover:bg-violet-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                            <Plus size={11} /> Agregar insumo
                        </button>
                    </div>

                    {suppliesArray.fields.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2 italic">
                            Sin insumos registrados. Agrega productos para control de inventario.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {suppliesArray.fields.map((supplyField, supplyIndex) => {
                                const supply = watchedItem?.supplies?.[supplyIndex];
                                const supplySubtotal =
                                    (Number(supply?.quantity) || 0) *
                                    (Number(supply?.unitPrice) || 0);

                                return (
                                    <div
                                        key={supplyField.id}
                                        className="flex flex-col sm:flex-row gap-2 items-end bg-white border border-violet-100 rounded-lg px-3 py-2"
                                    >
                                        {/* Product selector */}
                                        <div className="flex-[2] flex flex-col gap-1">
                                            <label className="text-[10px] font-medium text-slate-400">
                                                Insumo / Producto
                                            </label>
                                            <Controller
                                                name={
                                                    `items.${index}.supplies.${supplyIndex}.productId` as any
                                                }
                                                control={control}
                                                render={({ field, fieldState }) => {
                                                    const supplyOptions: ComboboxOption[] =
                                                        products
                                                            .filter((p) => p.is_service_supply)
                                                            .map((p) => {
                                                            const stockNum = Number(p.stock ?? 0);
                                                            const isOutOfStock = stockNum === 0;
                                                            return {
                                                                id: p.id,
                                                                label: p.name,
                                                                badge: `Stock: ${formatStock(p.stock ?? '0')}`,
                                                                badgeVariant: isOutOfStock
                                                                    ? 'error'
                                                                    : stockNum <= 5
                                                                      ? 'warning'
                                                                      : 'success',
                                                                disabled: isOutOfStock,
                                                            };
                                                        });
                                                    return (
                                                        <SearchableCombobox
                                                            options={supplyOptions}
                                                            value={field.value || null}
                                                            onChange={(id) => {
                                                                field.onChange(id);
                                                                // Reset presentation
                                                                setValue(
                                                                    `items.${index}.supplies.${supplyIndex}.presentationId` as any,
                                                                    null,
                                                                );
                                                                // Load presentations for this product
                                                                if (id)
                                                                    loadSupplyPresentations(
                                                                        id,
                                                                        supplyIndex,
                                                                    );
                                                                // Set base price from product
                                                                const qty =
                                                                    Number(supply?.quantity) || 1;
                                                                const result = applyProductPrice(
                                                                    id,
                                                                    products,
                                                                    qty,
                                                                );
                                                                if (result) {
                                                                    setValue(
                                                                        `items.${index}.supplies.${supplyIndex}.unitPrice` as any,
                                                                        result.unitPrice,
                                                                    );
                                                                    setValue(
                                                                        `items.${index}.supplies.${supplyIndex}.subtotal` as any,
                                                                        result.subtotal,
                                                                    );
                                                                }
                                                            }}
                                                            placeholder="Buscar insumo..."
                                                            error={fieldState.error?.message}
                                                            accent="violet"
                                                            compact
                                                        />
                                                    );
                                                }}
                                            />
                                        </div>

                                        {/* Presentation selector */}
                                        {!!supply?.productId &&
                                            supplyPresentations.has(supplyIndex) && (
                                                <div className="flex flex-col gap-1 w-32">
                                                    <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                        <Layers size={9} />
                                                        Presentación
                                                        {loadingSupplyPres && (
                                                            <span className="text-[8px] text-slate-400 animate-pulse">
                                                                cargando…
                                                            </span>
                                                        )}
                                                    </label>
                                                    <Controller
                                                        name={
                                                            `items.${index}.supplies.${supplyIndex}.presentationId` as any
                                                        }
                                                        control={control}
                                                        render={({ field }) => {
                                                            const presList =
                                                                supplyPresentations.get(
                                                                    supplyIndex,
                                                                ) || [];
                                                            const presOptions: ComboboxOption[] = [
                                                                { id: 0, label: 'Unidad base' },
                                                                ...presList.map((p) => ({
                                                                    id: p.id,
                                                                    label: p.name,
                                                                })),
                                                            ];
                                                            return (
                                                                <SearchableCombobox
                                                                    options={presOptions}
                                                                    value={field.value || 0}
                                                                    onChange={(id) => {
                                                                        const finalId =
                                                                            id === 0 ? null : id;
                                                                        field.onChange(finalId);
                                                                        if (!finalId) {
                                                                            const product =
                                                                                products.find(
                                                                                    (p) =>
                                                                                        p.id ===
                                                                                        supply?.productId,
                                                                                );
                                                                            if (product) {
                                                                                const qty =
                                                                                    Number(
                                                                                        supply?.quantity,
                                                                                    ) || 1;
                                                                                const price =
                                                                                    parseFloat(
                                                                                        product.price,
                                                                                    );
                                                                                setValue(
                                                                                    `items.${index}.supplies.${supplyIndex}.unitPrice` as any,
                                                                                    price,
                                                                                );
                                                                                setValue(
                                                                                    `items.${index}.supplies.${supplyIndex}.subtotal` as any,
                                                                                    price * qty,
                                                                                );
                                                                            }
                                                                            return;
                                                                        }
                                                                        const pres = presList.find(
                                                                            (p) => p.id === finalId,
                                                                        );
                                                                        if (!pres) return;
                                                                        const qty =
                                                                            Number(
                                                                                supply?.quantity,
                                                                            ) || 1;
                                                                        const price = parseFloat(
                                                                            pres.price,
                                                                        );
                                                                        setValue(
                                                                            `items.${index}.supplies.${supplyIndex}.unitPrice` as any,
                                                                            price,
                                                                        );
                                                                        setValue(
                                                                            `items.${index}.supplies.${supplyIndex}.subtotal` as any,
                                                                            price * qty,
                                                                        );
                                                                    }}
                                                                    placeholder={
                                                                        presList.length === 0
                                                                            ? 'Sin presentaciones'
                                                                            : 'Seleccionar…'
                                                                    }
                                                                    accent="violet"
                                                                    disabled={presList.length === 0}
                                                                    compact
                                                                />
                                                            );
                                                        }}
                                                    />
                                                </div>
                                            )}

                                        {/* Quantity */}
                                        <div className="flex flex-col gap-1 w-20">
                                            <label className="text-[10px] font-medium text-slate-400">
                                                Cant.
                                            </label>
                                            <Controller
                                                name={
                                                    `items.${index}.supplies.${supplyIndex}.quantity` as any
                                                }
                                                control={control}
                                                render={({ field }) => (
                                                    <input
                                                        {...field}
                                                        type="number"
                                                        min={1}
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-center outline-none focus:border-violet-400 transition-all"
                                                    />
                                                )}
                                            />
                                        </div>

                                        {/* Unit price */}
                                        <div className="flex flex-col gap-1 w-24">
                                            <label className="text-[10px] font-medium text-slate-400">
                                                Precio
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                                                    $
                                                </span>
                                                <Controller
                                                    name={
                                                        `items.${index}.supplies.${supplyIndex}.unitPrice` as any
                                                    }
                                                    control={control}
                                                    render={({ field }) => (
                                                        <input
                                                            {...field}
                                                            type="number"
                                                            step="0.01"
                                                            readOnly
                                                            className="w-full pl-5 pr-2 py-1.5 border border-slate-200 bg-slate-100 rounded-md text-xs outline-none cursor-not-allowed"
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Subtotal */}
                                        <div className="flex flex-col gap-1 w-24">
                                            <label className="text-[10px] font-medium text-slate-400">
                                                Subtotal
                                            </label>
                                            <div className="px-2.5 py-1.5 bg-violet-50 border border-violet-100 rounded-md text-xs font-semibold text-violet-700 h-[30px] flex items-center">
                                                ${supplySubtotal.toFixed(0)}
                                            </div>
                                        </div>

                                        {/* Remove supply */}
                                        <button
                                            type="button"
                                            onClick={() => suppliesArray.remove(supplyIndex)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-[1px]"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
