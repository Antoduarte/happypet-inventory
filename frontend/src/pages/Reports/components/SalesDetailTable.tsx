import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Receipt, Search } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { useSalesDetail } from '../../../hooks/useSalesDetail';
import { formatCurrency } from '../../../utils/format';
import type { SaleDetailItem, SaleDetailRow } from '../../../interfaces/report';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    qr: 'QR',
    credit: 'Crédito',
};

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatQuantity = (qty: string) => String(Number(qty));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SalesDetailTableProps {
    start: string;
    end: string;
    sellerId: number | null;
}

export const SalesDetailTable: React.FC<SalesDetailTableProps> = ({ start, end, sellerId }) => {
    const { sales, totalCount, isLoading, error, fetchDetail } = useSalesDetail();
    const { pagination, setPage, handleSearchChange } = usePagination();
    const { currentPage, itemsPerPage, search } = pagination;

    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // Report filter changes reset the table to the first page.
    useEffect(() => {
        setPage(1);
    }, [start, end, sellerId, setPage]);

    const load = useCallback(() => {
        fetchDetail({
            start,
            end,
            cashier_id: sellerId ?? undefined,
            page: currentPage,
            page_size: itemsPerPage,
            search: search || undefined,
        });
    }, [fetchDetail, start, end, sellerId, currentPage, itemsPerPage, search]);

    useEffect(() => {
        load();
    }, [load]);

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative w-full max-w-sm">
                <Input
                    placeholder="Buscar por producto, servicio o ticket..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                />
                <Search className="absolute left-3 top-[10px] text-slate-400" size={18} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4 w-10"></th>
                                <th className="px-4 py-4">Fecha</th>
                                <th className="px-4 py-4">Ticket</th>
                                <th className="px-4 py-4">Vendedor</th>
                                <th className="px-4 py-4">Ítems</th>
                                <th className="px-4 py-4">Pago</th>
                                <th className="px-4 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-4 bg-slate-200 rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : sales.length > 0 ? (
                                sales.map((sale) => (
                                    <SaleRow
                                        key={sale.id}
                                        sale={sale}
                                        isExpanded={expandedIds.has(sale.id)}
                                        onToggle={() => toggleExpand(sale.id)}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-6 py-8 text-center text-slate-500"
                                    >
                                        No se encontraron ventas en el período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={itemsPerPage}
                    onPageChange={setPage}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// SaleRow
// ---------------------------------------------------------------------------

interface SaleRowProps {
    sale: SaleDetailRow;
    isExpanded: boolean;
    onToggle: () => void;
}

const SaleRow: React.FC<SaleRowProps> = ({ sale, isExpanded, onToggle }) => {
    const itemCount = sale.items.length;

    return (
        <>
            <tr
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={onToggle}
            >
                {/* Expand chevron */}
                <td className="px-4 py-3.5">
                    <button
                        type="button"
                        className="p-1 rounded-md hover:bg-slate-100 transition-colors text-slate-400"
                        aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                        {isExpanded ? (
                            <ChevronDown size={16} className="text-brand" />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                    </button>
                </td>

                {/* Date */}
                <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                            {formatDate(sale.sale_date)}
                        </span>
                        <span className="text-xs text-slate-400">{formatTime(sale.sale_date)}</span>
                    </div>
                </td>

                {/* Ticket */}
                <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Receipt size={14} className="text-slate-400" />#{sale.id}
                    </span>
                </td>

                {/* Seller */}
                <td className="px-4 py-3.5 text-slate-700">{sale.seller_name}</td>

                {/* Items count */}
                <td className="px-4 py-3.5 text-slate-600">
                    {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                </td>

                {/* Payment */}
                <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
                        {PAYMENT_LABELS[sale.payment_type] ?? sale.payment_type}
                    </span>
                </td>

                {/* Total */}
                <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                    {formatCurrency(sale.total_price)}
                </td>
            </tr>

            {/* Expanded detail rows */}
            {isExpanded && (
                <tr>
                    <td colSpan={7} className="p-0">
                        <div className="bg-slate-50 border-b border-slate-200">
                            <div className="px-6 py-2">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-500 uppercase tracking-wide">
                                            <th className="text-left py-2 font-semibold">Tipo</th>
                                            <th className="text-left py-2 font-semibold">
                                                Detalle
                                            </th>
                                            <th className="text-right py-2 font-semibold">Cant.</th>
                                            <th className="text-right py-2 font-semibold">
                                                P. Unit
                                            </th>
                                            <th className="text-right py-2 font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sale.items.map((item) => (
                                            <ItemRow key={item.id} item={item} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

// ---------------------------------------------------------------------------
// ItemRow
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
    product: { label: 'Producto', classes: 'bg-sky-100 text-sky-700 border-sky-200' },
    service: { label: 'Servicio', classes: 'bg-violet-100 text-violet-700 border-violet-200' },
    supply: { label: 'Insumo', classes: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const ItemRow: React.FC<{ item: SaleDetailItem }> = ({ item }) => {
    const badgeKey = item.is_supply ? 'supply' : item.type;
    const badge = TYPE_BADGE[badgeKey];

    return (
        <tr className="border-t border-slate-200/50">
            <td className="py-2.5 pr-2">
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.classes}`}
                >
                    {badge.label}
                </span>
            </td>
            <td className="py-2.5 text-slate-800 font-medium">
                {item.name}
                {item.discount_percentage > 0 && (
                    <span className="ml-2 text-[11px] font-semibold text-emerald-600">
                        −{item.discount_percentage}%
                    </span>
                )}
                {item.surcharge_percentage > 0 && (
                    <span className="ml-2 text-[11px] font-semibold text-amber-600">
                        +{item.surcharge_percentage}%
                    </span>
                )}
            </td>
            <td className="py-2.5 text-right text-slate-600">{formatQuantity(item.quantity)}</td>
            <td className="py-2.5 text-right text-slate-500">
                {formatCurrency(item.price_per_item)}
            </td>
            <td className="py-2.5 text-right font-medium text-slate-800">
                {formatCurrency(item.total_price)}
            </td>
        </tr>
    );
};
