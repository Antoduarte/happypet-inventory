/**
 * SaleFormPage
 *
 * Pantalla de creación de nueva venta.
 *
 * Arquitectura modular:
 * - useSaleForm  → toda la lógica de formulario / Zod / cálculos
 * - SaleProductRow → fila de ítem tipo producto
 * - SaleServiceRow → fila de ítem tipo servicio (con insumos anidados)
 * - AdjustmentFields → descuento/recargo reutilizable
 *
 * Flujo:
 * 1. El usuario selecciona método de pago
 * 2. Agrega ítems (productos y/o servicios)
 * 3. Configura cantidades, precios, descuentos/recargos por línea
 * 4. Opcionalmente aplica descuento/recargo global
 * 5. Confirma la venta → se mapea al payload del backend y se envía
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    ShoppingCart,
    Wrench,
    CreditCard,
    AlertCircle,
    Receipt,
    Package,
    TrendingDown,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Banknote,
    ArrowLeftRight,
    BadgeCheck,
    Printer,
} from 'lucide-react';
import { useState } from 'react';
import { Controller } from 'react-hook-form';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormSection } from '@/components/ui/FormSection';

import { useSale } from '../../hooks/useSale';
import { useProduct } from '../../hooks/useProduct';
import { useService } from '../../hooks/useService';
import { useAuth } from '../../hooks/useAuth';
import { useManagerGate } from '../../hooks/useManagerGate';

import { SaleProductRow } from './components/SaleProductRow';
import { SaleServiceRow } from './components/SaleServiceRow';
import { AdjustmentFields } from './components/AdjustmentFields';
import { useSaleForm, defaultProductItem, defaultServiceItem } from './hooks/useSaleForm';

// ---------------------------------------------------------------------------
// Payment method config
// ---------------------------------------------------------------------------

const PAYMENT_OPTIONS = [
    {
        value: 'cash',
        label: 'Efectivo',
        icon: Banknote,
        activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200',
        iconClass: 'text-emerald-200',
    },
    {
        value: 'card',
        label: 'Tarjeta',
        icon: CreditCard,
        activeClass: 'border-brand bg-brand text-white shadow-md shadow-brand/25',
        iconClass: 'text-violet-200',
    },
    {
        value: 'transfer',
        label: 'Transferencia',
        icon: ArrowLeftRight,
        activeClass: 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-200',
        iconClass: 'text-violet-200',
    },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SaleFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { addSale, isLoading } = useSale();
    const { products, fetchProducts } = useProduct();
    const { services, fetchServices } = useService();
    const { cashSessionId, cashSessionStatus } = useAuth();
    const { requireAuthorization, managerGateModal } = useManagerGate(
        'Para aplicar descuentos o recargos superiores al 10% necesitas el código de autorización de un gerente o administrador.',
    );

    const [showGlobalAdjustments, setShowGlobalAdjustments] = useState(false);

    const { form, itemsArray, watchedItems, itemsSubtotal, grandTotal, buildPayload } =
        useSaleForm();

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = form;

    const watchedGlobalDiscount = watch('discount_percentage');
    const watchedGlobalSurcharge = watch('surcharge_percentage');
    const hasGlobalAdjustment =
        Number(watchedGlobalDiscount) > 0 || Number(watchedGlobalSurcharge) > 0;

    // Load data on mount
    useEffect(() => {
        fetchProducts({ page_size: 200 });
        fetchServices({ page_size: 200, is_active: true });
    }, [fetchProducts, fetchServices]);

    // Redirect if no open cash session
    useEffect(() => {
        if (cashSessionStatus !== 'open') {
            if (cashSessionStatus === 'suspended' && cashSessionId) {
                navigate(`/cash/resume/${cashSessionId}`);
            } else {
                navigate('/cash/open');
            }
        }
    }, [cashSessionStatus, cashSessionId, navigate]);

    // ── Submit ─────────────────────────────────────────────────────────────────

    function needsDiscountAuth(payload: ReturnType<typeof buildPayload>): boolean {
        const itemHasAuth = (item: {
            discount_percentage?: number;
            surcharge_percentage?: number;
        }) => (item.discount_percentage ?? 0) > 10 || (item.surcharge_percentage ?? 0) > 10;
        return (
            (payload.discount_percentage ?? 0) > 10 ||
            (payload.surcharge_percentage ?? 0) > 10 ||
            payload.items.some(itemHasAuth)
        );
    }

    const handleFormSubmit = (data: any) => {
        const payload = buildPayload(data);

        const submit = async (code?: string) => {
            const created = await addSale(code ? { ...payload, manager_code: code } : payload);
            if (created) navigate('/sales');
        };

        if (needsDiscountAuth(payload)) {
            requireAuthorization(submit);
        } else {
            void submit();
        }
    };

    const handleFormSubmitAndPrint = (data: any) => {
        const payload = buildPayload(data);

        const submit = async (code?: string) => {
            const created = await addSale(code ? { ...payload, manager_code: code } : payload);
            if (created) {
                window.open(`http://localhost:8000/api/sales/${created.id}/print/`, '_blank');
            }
        };

        if (needsDiscountAuth(payload)) {
            requireAuthorization(submit);
        } else {
            void submit();
        }
    };

    // ── Summary helpers ────────────────────────────────────────────────────────

    const productCount = (watchedItems ?? []).filter((i) => i._kind === 'product').length;
    const serviceCount = (watchedItems ?? []).filter((i) => i._kind === 'service').length;
    const discountAmount = itemsSubtotal - grandTotal < 0 ? 0 : itemsSubtotal - grandTotal;
    const surchargeAmount = grandTotal - itemsSubtotal < 0 ? 0 : grandTotal - itemsSubtotal;

    // Render
    // ---------------------------------------------------------------------------

    return (
        <div>
            <PageHeader
                title="Nueva Venta"
                breadcrumbs={[
                    { label: 'Panel', path: '/' },
                    { label: 'Ventas', path: '/sales' },
                    { label: 'Nueva' },
                ]}
            />

            <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
                <div className="max-w-5xl space-y-5">
                    {/* ── PAYMENT METHOD ──────────────────────────────────────── */}
                    <Card>
                        <FormSection
                            title="Método de Pago"
                            description="Selecciona cómo se realizará el cobro"
                            icon={CreditCard}
                            iconBg="bg-brand/10"
                            iconColor="text-brand"
                        >
                            <Controller
                                name="payment_type"
                                control={control}
                                render={({ field }) => (
                                    <div
                                        className="flex flex-wrap gap-2"
                                        role="radiogroup"
                                        aria-label="Método de pago"
                                    >
                                        {PAYMENT_OPTIONS.map((opt) => {
                                            const Icon = opt.icon;
                                            const isActive = field.value === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isActive}
                                                    onClick={() => field.onChange(opt.value)}
                                                    className={[
                                                        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                                                        isActive
                                                            ? opt.activeClass
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                                    ].join(' ')}
                                                >
                                                    <Icon
                                                        size={15}
                                                        className={isActive ? opt.iconClass : ''}
                                                        aria-hidden
                                                    />
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            />
                        </FormSection>
                    </Card>

                    {/* ── ITEMS ─────────────────────────────────────────────── */}
                    <Card>
                        {/* Section header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <div className="flex items-center gap-2.5">
                                <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600">
                                    <Receipt size={14} aria-hidden />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        Productos y Servicios
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {productCount > 0 && (
                                            <span className="mr-2">
                                                <Package size={9} className="inline mr-0.5" />
                                                {productCount} producto
                                                {productCount !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {serviceCount > 0 && (
                                            <span>
                                                <Wrench size={9} className="inline mr-0.5" />
                                                {serviceCount} servicio
                                                {serviceCount !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {productCount === 0 &&
                                            serviceCount === 0 &&
                                            'Agrega productos o servicios a la venta'}
                                    </p>
                                </div>
                            </div>

                            {/* Add buttons */}
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => itemsArray.append(defaultProductItem())}
                                    className="gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                    <Plus size={13} />
                                    <Package size={13} />
                                    Producto
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => itemsArray.append(defaultServiceItem())}
                                    className="gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50"
                                >
                                    <Plus size={13} />
                                    <Wrench size={13} />
                                    Servicio
                                </Button>
                            </div>
                        </div>

                        {/* Items list */}
                        {itemsArray.fields.length === 0 ? (
                            <EmptyItemsState
                                onAddProduct={() => itemsArray.append(defaultProductItem())}
                                onAddService={() => itemsArray.append(defaultServiceItem())}
                            />
                        ) : (
                            <div className="space-y-3">
                                {itemsArray.fields.map((field, index) => {
                                    const item = watchedItems?.[index];
                                    const isProduct = item?._kind === 'product';

                                    return isProduct ? (
                                        <SaleProductRow
                                            key={field.id}
                                            index={index}
                                            control={control}
                                            setValue={setValue}
                                            products={products}
                                            watchedItem={item}
                                            canRemove={itemsArray.fields.length > 0}
                                            onRemove={() => itemsArray.remove(index)}
                                        />
                                    ) : (
                                        <SaleServiceRow
                                            key={field.id}
                                            index={index}
                                            control={control}
                                            setValue={setValue}
                                            services={services}
                                            products={products}
                                            watchedItem={item}
                                            canRemove={itemsArray.fields.length > 0}
                                            onRemove={() => itemsArray.remove(index)}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Items-level error */}
                        {errors.items?.message && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <AlertCircle size={14} />
                                {errors.items.message}
                            </div>
                        )}
                    </Card>

                    {/* ── ORDER SUMMARY ─────────────────────────────────────── */}
                    <Card>
                        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
                            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600">
                                <ShoppingCart size={14} aria-hidden />
                            </span>
                            <p className="text-sm font-semibold text-slate-700">
                                Resumen de la Orden
                            </p>
                        </div>

                        {/* Summary rows */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal ítems</span>
                                <span className="font-medium">C${itemsSubtotal.toFixed(2)}</span>
                            </div>

                            {Number(watchedGlobalDiscount) > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span className="flex items-center gap-1">
                                        <TrendingDown size={12} />
                                        Descuento global ({watchedGlobalDiscount}%)
                                    </span>
                                    <span className="font-medium">
                                        -C${discountAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {Number(watchedGlobalSurcharge) > 0 && (
                                <div className="flex justify-between text-amber-600">
                                    <span className="flex items-center gap-1">
                                        <TrendingUp size={12} />
                                        Recargo global ({watchedGlobalSurcharge}%)
                                    </span>
                                    <span className="font-medium">
                                        +C${surchargeAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                <span className="font-bold text-slate-900 text-base">Total</span>
                                <span className="font-bold text-brand text-xl">
                                    C${grandTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Global adjustments toggle */}
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => setShowGlobalAdjustments((v) => !v)}
                                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                                    hasGlobalAdjustment
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        : 'text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {showGlobalAdjustments ? (
                                    <ChevronUp size={13} />
                                ) : (
                                    <ChevronDown size={13} />
                                )}
                                {hasGlobalAdjustment
                                    ? 'Ajuste global aplicado'
                                    : 'Aplicar descuento / recargo a toda la venta'}
                            </button>

                            {showGlobalAdjustments && (
                                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                        Ajuste sobre el total de la venta
                                    </p>
                                    <AdjustmentFields
                                        control={control}
                                        discountName="discount_percentage"
                                        surchargeName="surcharge_percentage"
                                        surchargeReasonName="surcharge_reason"
                                        watchedDiscount={Number(watchedGlobalDiscount) || 0}
                                        watchedSurcharge={Number(watchedGlobalSurcharge) || 0}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── FORM ACTIONS ─────────────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pb-6">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => navigate('/sales')}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                isLoading={isLoading || isSubmitting}
                                disabled={isLoading || isSubmitting}
                                className="w-full sm:w-auto gap-2 min-w-[180px]"
                            >
                                <BadgeCheck size={15} />
                                {isLoading || isSubmitting ? 'Procesando...' : 'Confirmar Venta'}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit(handleFormSubmitAndPrint)}
                                isLoading={isLoading || isSubmitting}
                                disabled={isLoading || isSubmitting}
                                className="w-full sm:w-auto gap-2 min-w-[200px] bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                            >
                                <Printer size={15} />
                                {isLoading || isSubmitting
                                    ? 'Procesando...'
                                    : 'Confirmar e Imprimir'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
            {managerGateModal}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Empty state sub-component
// ---------------------------------------------------------------------------

interface EmptyItemsStateProps {
    onAddProduct: () => void;
    onAddService: () => void;
}

const EmptyItemsState: React.FC<EmptyItemsStateProps> = ({ onAddProduct, onAddService }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingCart size={28} className="text-slate-300" />
        </div>

        <p className="text-sm font-semibold text-slate-600 mb-1">Sin ítems en la venta</p>
        <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
            Agrega productos vendidos o servicios prestados. Los servicios pueden incluir insumos
            para control de inventario.
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
            <button
                type="button"
                onClick={onAddProduct}
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2.5 rounded-xl transition-all hover:shadow-sm"
            >
                <span className="p-1 bg-indigo-100 rounded-lg">
                    <Package size={14} />
                </span>
                Agregar Producto
            </button>
            <button
                type="button"
                onClick={onAddService}
                className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-4 py-2.5 rounded-xl transition-all hover:shadow-sm"
            >
                <span className="p-1 bg-violet-100 rounded-lg">
                    <Wrench size={14} />
                </span>
                Agregar Servicio
            </button>
        </div>
    </div>
);
