import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SaleHeroCard } from '../../components/ui/SaleHeroCard';
import { FinancialSummaryCard } from '../../components/ui/FinancialSummaryCard';
import { ServiceItemCard } from '../../components/ui/ServiceItemCard';
import { ProductItemCard } from '../../components/ui/ProductItemCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

import { useSale } from '../../hooks/useSale';
import { useManagerGate } from '../../hooks/useManagerGate';
import type { SaleItem } from '../../interfaces/sale';

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

const SkeletonHeroCard: React.FC = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-5 animate-pulse">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
                <div className="h-5 w-24 bg-slate-200 rounded" />
                <div className="h-5 w-20 bg-slate-200 rounded" />
                <div className="h-5 w-20 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between">
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
            <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-4 w-20 bg-slate-200 rounded" />
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
                <div className="h-5 w-12 bg-slate-200 rounded" />
                <div className="h-7 w-24 bg-slate-200 rounded" />
            </div>
        </div>
    </div>
);

const SkeletonItemCard: React.FC = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg bg-slate-200" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
            </div>
            <div className="space-y-2 text-right">
                <div className="h-5 w-16 bg-slate-200 rounded" />
                <div className="h-3 w-14 bg-slate-200 rounded" />
            </div>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const SaleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const numericId = id ? parseInt(id, 10) : null;
    const {
        currentSale,
        isLoading,
        error,
        errorStatusCode,
        fetchSaleById,
        clearCurrentSale,
        updateSaleStatus,
    } = useSale();
    const { requireAuthorization, managerGateModal } = useManagerGate();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleCancelSale = () => {
        if (!numericId) return;
        setIsConfirmOpen(false);
        // Cancelar una venta requiere código de gerente para cajeros (una vez por sesión).
        requireAuthorization(async (code) => {
            await updateSaleStatus(numericId, 'cancelled', code);
        });
    };
    const topRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (numericId) {
            fetchSaleById(numericId);
        }
        return () => {
            clearCurrentSale();
        };
    }, [numericId, fetchSaleById, clearCurrentSale]);

    useEffect(() => {
        if (!isLoading && currentSale && topRef.current) {
            topRef.current.focus();
        }
    }, [isLoading, currentSale]);

    const handleRetry = () => {
        if (numericId) {
            fetchSaleById(numericId);
        }
    };

    const handlePrint = () => {
        window.open(`http://localhost:8000/api/sales/${sale.id}/print/`, '_blank');
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Detalle de Venta"
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Ventas', path: '/sales' },
                        { label: 'Cargando...' },
                    ]}
                    action={
                        <Button variant="secondary" onClick={() => navigate('/sales')}>
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    }
                />
                <div ref={topRef} tabIndex={-1} />
                <SkeletonHeroCard />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Servicios
                        </h3>
                        <SkeletonItemCard />
                        <SkeletonItemCard />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Productos
                        </h3>
                        <SkeletonItemCard />
                    </div>
                </div>
            </div>
        );
    }

    // 404 state
    if (error && errorStatusCode === 404) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Venta no encontrada"
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Ventas', path: '/sales' },
                        { label: 'No encontrada' },
                    ]}
                    action={
                        <Button variant="secondary" onClick={() => navigate('/sales')}>
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    }
                />
                <div className="text-center py-12">
                    <p className="text-slate-500 mb-4">
                        La venta solicitada no existe o fue eliminada.
                    </p>
                </div>
            </div>
        );
    }

    // Generic error state
    if (error) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Error"
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Ventas', path: '/sales' },
                        { label: 'Error' },
                    ]}
                    action={
                        <Button variant="secondary" onClick={() => navigate('/sales')}>
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    }
                />
                <div className="text-center py-12">
                    <p className="text-slate-500 mb-4">{error}</p>
                    <div className="flex justify-center gap-3">
                        <Button onClick={handleRetry}>Reintentar</Button>
                    </div>
                </div>
            </div>
        );
    }

    // No sale loaded
    if (!currentSale) {
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Detalle de Venta"
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Ventas', path: '/sales' },
                        { label: 'Detalle' },
                    ]}
                    action={
                        <Button variant="secondary" onClick={() => navigate('/sales')}>
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    }
                />
                <div className="text-center py-12">
                    <p className="text-slate-500 mb-4">No se pudo cargar la venta.</p>
                </div>
            </div>
        );
    }

    const sale = currentSale;

    // Separate services and products (supplies are attached to their parent service)
    const serviceItems = sale.items.filter(
        (item) => item.type === 'service' && !item.parent_service_item,
    );
    const productItems = sale.items.filter(
        (item) => item.type === 'product' && !item.parent_service_item,
    );

    // Group supplies under their parent service
    const getSuppliesForService = (serviceId: number): SaleItem[] =>
        sale.items.filter((item) => item.parent_service_item === serviceId);

    return (
        <div className="space-y-5">
            {/* Header with back button */}
            <PageHeader
                title={`Venta #${sale.id}`}
                breadcrumbs={[
                    { label: 'Panel', path: '/' },
                    { label: 'Ventas', path: '/sales' },
                    { label: `Venta #${sale.id}` },
                ]}
                action={
                    <div className="flex items-center gap-2">
                        {sale.status !== 'cancelled' && (
                            <Button
                                variant="danger"
                                onClick={() => setIsConfirmOpen(true)}
                                className="gap-1.5"
                            >
                                <X size={15} /> Cancelar Venta
                            </Button>
                        )}
                        {sale.status !== 'cancelled' && (
                            <Button variant="secondary" onClick={handlePrint}>
                                <Printer size={15} /> Imprimir
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => navigate('/sales')}>
                            <ArrowLeft size={15} /> Volver
                        </Button>
                    </div>
                }
            />

            {/* Focus target for a11y */}
            <div ref={topRef} tabIndex={-1} />

            {/* Hero card with sale metadata + financial breakdown */}
            <SaleHeroCard sale={sale} />

            {/* Two-column layout: Servicios | Productos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Services column */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
                        Servicios
                    </h3>
                    {serviceItems.length === 0 ? (
                        <p className="text-center text-slate-400 py-8 text-sm">Sin servicios</p>
                    ) : (
                        serviceItems.map((service) => (
                            <ServiceItemCard
                                key={service.id}
                                item={service}
                                supplies={getSuppliesForService(service.id)}
                            />
                        ))
                    )}
                </div>

                {/* Products column */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
                        Productos
                    </h3>
                    {productItems.length === 0 ? (
                        <p className="text-center text-slate-400 py-8 text-sm">Sin productos</p>
                    ) : (
                        productItems.map((product) => (
                            <ProductItemCard key={product.id} item={product} />
                        ))
                    )}
                </div>
            </div>

            {/* Financial summary below items */}
            <FinancialSummaryCard sale={sale} />

            {/* Confirmation dialog for sale cancellation */}
            <ConfirmDialog
                isOpen={isConfirmOpen}
                title="¿Cancelar Venta?"
                message="¿Estás seguro de que deseas cancelar esta venta? Esta acción devolverá los productos al stock y no se puede deshacer."
                confirmLabel="Sí, Cancelar Venta"
                cancelLabel="No, Mantener Venta"
                variant="danger"
                onConfirm={handleCancelSale}
                onCancel={() => setIsConfirmOpen(false)}
            />

            {/* Autorización de gerente (cajeros) */}
            {managerGateModal}
        </div>
    );
};
