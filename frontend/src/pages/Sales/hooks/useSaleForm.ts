/**
 * useSaleForm
 *
 * Hook de l�gica puro para SaleFormPage.
 * Encapsula:
 * - Definici�n del schema Zod completo (productos, servicios, insumos, ajustes)
 * - Inicializaci�n de react-hook-form
 * - C�lculos reactivos de subtotales, descuentos y recargos
 * - Mapeo del form hacia CreateSalePayload del backend
 */

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type {
    CreateSalePayload,
    SaleItemPayload,
    DiscountPercentage,
} from '../../../interfaces/sale';
import type { Product } from '../../../interfaces/product';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30] as const;

// ---------------------------------------------------------------------------
// Zod sub-schemas
// ---------------------------------------------------------------------------

/** Un insumo/producto consumido dentro de un servicio */
const serviceSupplySchema = z.object({
    productId: z.coerce
        .number({ message: 'Seleccione un producto' })
        .min(1, 'El producto es requerido'),
    presentationId: z.coerce.number().optional().nullable(),
    quantity: z.coerce.number().min(1, 'M�nimo 1'),
    unitPrice: z.coerce.number().min(0),
    subtotal: z.number().min(0),
});

/** Un �tem de tipo PRODUCTO en la venta */
const productItemSchema = z.object({
    _kind: z.literal('product'),
    productId: z.coerce
        .number({ message: 'Seleccione un producto' })
        .min(1, 'El producto es requerido'),
    /** Optional presentation ID � if set, stock is deducted via multiplier */
    presentationId: z.coerce.number().optional().nullable(),
    quantity: z.coerce.number().min(0.0001, 'M�nimo 0.0001'),
    unitPrice: z.coerce.number().min(0),
    subtotal: z.number().min(0),
    discount_percentage: z.coerce.number().default(0),
    surcharge_percentage: z.coerce.number().default(0),
    surcharge_reason: z.string().optional(),
});

/** Un �tem de tipo SERVICIO en la venta (con insumos opcionales) */
const serviceItemSchema = z.object({
    _kind: z.literal('service'),
    serviceId: z.coerce
        .number({ message: 'Seleccione un servicio' })
        .min(1, 'El servicio es requerido'),
    quantity: z.coerce.number().min(1, 'M�nimo 1'),
    unitPrice: z.coerce.number().min(0),
    subtotal: z.number().min(0),
    discount_percentage: z.coerce.number().default(0),
    surcharge_percentage: z.coerce.number().default(0),
    surcharge_reason: z.string().optional(),
    /** Insumos/productos utilizados en este servicio */
    supplies: z.array(serviceSupplySchema).default([]),
});

/** Discriminated union: product | service */
const saleItemSchema = z.discriminatedUnion('_kind', [productItemSchema, serviceItemSchema]);

/** Schema ra�z del formulario */
export const saleFormSchema = z.object({
    payment_type: z.enum(['cash', 'card', 'transfer']),
    discount_percentage: z.coerce.number().default(0),
    surcharge_percentage: z.coerce.number().default(0),
    surcharge_reason: z.string().optional(),
    items: z.array(saleItemSchema).min(1, 'Agrega al menos un producto o servicio a la venta'),
});

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type SaleFormData = z.infer<typeof saleFormSchema>;
export type SaleProductItem = z.infer<typeof productItemSchema>;
export type SaleServiceItem = z.infer<typeof serviceItemSchema>;
export type SaleFormItem = z.infer<typeof saleItemSchema>;
export type ServiceSupply = z.infer<typeof serviceSupplySchema>;

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

export const defaultProductItem = (): SaleProductItem => ({
    _kind: 'product',
    productId: 0,
    presentationId: null,
    quantity: 1,
    unitPrice: 0,
    subtotal: 0,
    discount_percentage: 0,
    surcharge_percentage: 0,
    surcharge_reason: '',
});

export const defaultServiceItem = (): SaleServiceItem => ({
    _kind: 'service',
    serviceId: 0,
    quantity: 1,
    unitPrice: 0,
    subtotal: 0,
    discount_percentage: 0,
    surcharge_percentage: 0,
    surcharge_reason: '',
    supplies: [],
});

export const defaultSupply = (): ServiceSupply => ({
    productId: 0,
    presentationId: null,
    quantity: 1,
    unitPrice: 0,
    subtotal: 0,
});

// ---------------------------------------------------------------------------
// Helper: calculate adjusted price
// ---------------------------------------------------------------------------

export function calcAdjustedTotal(
    subtotal: number,
    discountPct: number,
    surchargePct: number,
): number {
    if (discountPct > 0) return subtotal * (1 - discountPct / 100);
    if (surchargePct > 0) return subtotal * (1 + surchargePct / 100);
    return subtotal;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSaleForm() {
    const form = useForm<SaleFormData>({
        resolver: zodResolver(saleFormSchema) as any,
        defaultValues: {
            payment_type: 'cash',
            discount_percentage: 0,
            surcharge_percentage: 0,
            surcharge_reason: '',
            items: [],
        },
        mode: 'onChange',
    });

    const { control, watch, setValue } = form;

    const itemsArray = useFieldArray({ control, name: 'items' });
    const watchedItems = watch('items');
    const watchedGlobalDiscount = watch('discount_percentage');
    const watchedGlobalSurcharge = watch('surcharge_percentage');

    // -- Reactive: update subtotals when key fields change ---------------------
    useEffect(() => {
        const subscription = watch((values, { name }) => {
            if (!name?.startsWith('items.')) return;

            const parts = name.split('.');
            const index = parseInt(parts[1]);
            const item = values.items?.[index];
            if (!item) return;

            const field = parts.slice(2).join('.');
            const isProductItem = item._kind === 'product';
            const isServiceItem = item._kind === 'service';

            // -- Product item: price auto-fill and subtotal ------------------
            if (isProductItem) {
                if (
                    field === 'quantity' ||
                    field === 'unitPrice' ||
                    field === 'discount_percentage' ||
                    field === 'surcharge_percentage'
                ) {
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unitPrice) || 0;
                    const sub = qty * price;
                    setValue(`items.${index}.subtotal`, sub);
                }
            }

            // -- Service item: subtotal --------------------------------------
            if (isServiceItem) {
                if (
                    field === 'quantity' ||
                    field === 'unitPrice' ||
                    field === 'discount_percentage' ||
                    field === 'surcharge_percentage'
                ) {
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unitPrice) || 0;
                    const sub = qty * price;
                    setValue(`items.${index}.subtotal`, sub);
                }

                // -- Supply within service ---------------------------------
                if (field.startsWith('supplies.')) {
                    const supplyParts = field.split('.');
                    const supplyIndex = parseInt(supplyParts[1]);
                    const subField = supplyParts[2];

                    // Evitar bucle: solo recalcular si cambi� cantidad o precio unitario
                    if (subField === 'quantity' || subField === 'unitPrice') {
                        const supply = (item as SaleServiceItem).supplies?.[supplyIndex];
                        if (supply) {
                            const sub =
                                (Number(supply.quantity) || 0) * (Number(supply.unitPrice) || 0);
                            setValue(`items.${index}.supplies.${supplyIndex}.subtotal`, sub);
                        }
                    }
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [watch, setValue]);

    // -- Totals calculation -----------------------------------------------------

    const itemsSubtotal = (watchedItems ?? []).reduce((acc, item) => {
        const sub = Number(item?.subtotal) || 0;
        const disc = Number((item as any)?.discount_percentage) || 0;
        const sur = Number((item as any)?.surcharge_percentage) || 0;
        const adjustedItem = calcAdjustedTotal(sub, disc, sur);

        // NOTE: supplies (insumos) are excluded from the total � they only deduct stock
        return acc + adjustedItem;
    }, 0);

    const grandTotal = calcAdjustedTotal(
        itemsSubtotal,
        Number(watchedGlobalDiscount) || 0,
        Number(watchedGlobalSurcharge) || 0,
    );

    // -- Payload mapper --------------------------------------------------------

    function buildPayload(data: SaleFormData): CreateSalePayload {
        /**
         * Flatten all items + service supplies into a single list.
         * Supplies are sent as standalone product items so the backend can
         * deduct their stock via the existing _deduct_stock logic.
         */
        const allItems: SaleItemPayload[] = [];

        data.items.forEach((item) => {
            if (item._kind === 'product') {
                allItems.push({
                    product_id: item.productId,
                    presentation_id: item.presentationId ?? null,
                    service_id: null,
                    type: 'product',
                    quantity: item.quantity,
                    discount_percentage: item.discount_percentage as DiscountPercentage,
                    surcharge_percentage: item.surcharge_percentage as DiscountPercentage,
                    surcharge_reason: item.surcharge_reason || null,
                });
            } else {
                // Service item itself (quantity always 1)
                allItems.push({
                    product_id: null,
                    service_id: item.serviceId,
                    type: 'service',
                    quantity: 1,
                    discount_percentage: item.discount_percentage as DiscountPercentage,
                    surcharge_percentage: item.surcharge_percentage as DiscountPercentage,
                    surcharge_reason: item.surcharge_reason || null,
                });
                // Insumos del servicio ? �tems de producto con v�nculo al servicio padre
                (item.supplies ?? []).forEach((s) => {
                    allItems.push({
                        product_id: s.productId,
                        presentation_id: s.presentationId ?? null,
                        service_id: item.serviceId,
                        type: 'product',
                        is_supply: true,
                        quantity: s.quantity,
                        discount_percentage: 0 as DiscountPercentage,
                        surcharge_percentage: 0 as DiscountPercentage,
                        surcharge_reason: null,
                    });
                });
            }
        });

        return {
            items: allItems,
            payment_type: data.payment_type,
            discount_percentage: data.discount_percentage as DiscountPercentage,
            surcharge_percentage: data.surcharge_percentage as DiscountPercentage,
            surcharge_reason: data.surcharge_reason || null,
        };
    }

    return {
        form,
        itemsArray,
        watchedItems,
        itemsSubtotal,
        grandTotal,
        buildPayload,
    };
}

/** Helper to update a product item's unit price when a product is selected */
export function applyProductPrice(
    productId: number,
    products: Product[],
    currentQty: number,
): { unitPrice: number; subtotal: number } | null {
    const product = products.find((p) => p.id === productId);
    if (!product) return null;
    const price = parseFloat(product.price);
    return { unitPrice: price, subtotal: price * currentQty };
}
