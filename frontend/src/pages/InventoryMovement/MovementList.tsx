import React, { useCallback, useEffect, useState } from 'react';
import {
    Plus,
    ArrowDownToLine,
    ArrowUpFromLine,
    ChevronRight,
    ChevronDown,
    Package,
    Search,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Input } from '../../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { useStock } from '../../hooks/useStock';
import { usePagination } from '../../hooks/usePagination';
import type { MovementBatch, MovementType } from '../../interfaces/product';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
    in: 'Entrada',
    out: 'Salida',
};

const MOVEMENT_TYPE_COLORS: Record<MovementType, { bg: string; text: string; badge: string }> = {
    in: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    out: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
    },
};

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MovementList: React.FC = () => {
    const navigate = useNavigate();
    const { batches, totalCount, isLoading, fetchBatches } = useStock();
    const { pagination, setPage, handleSearchChange } = usePagination();
    const { currentPage, itemsPerPage, search } = pagination;

    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const loadBatches = useCallback(() => {
        fetchBatches({
            page: currentPage,
            page_size: itemsPerPage,
            search,
        });
    }, [fetchBatches, currentPage, itemsPerPage, search]);

    useEffect(() => {
        loadBatches();
    }, [loadBatches]);

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

    const handleAdd = () => navigate('/movements/new');

    return (
        <div>
            <PageHeader
                title="Movimientos de Inventario"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Movimientos' }]}
                action={
                    <Button onClick={handleAdd} className="gap-2">
                        <Plus size={18} />
                        Registrar Movimiento
                    </Button>
                }
            />

            <Card>
                <div className="flex flex-col gap-4">
                    {/* Search */}
                    <div className="flex gap-2 items-center">
                        <div className="relative w-full max-w-sm">
                            <Input
                                placeholder="Buscar por notas o producto..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                            <Search
                                className="absolute left-3 top-[10px] text-slate-400"
                                size={18}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-4 w-10"></th>
                                        <th className="px-4 py-4">Fecha</th>
                                        <th className="px-4 py-4">Tipo</th>
                                        <th className="px-4 py-4">Productos</th>
                                        <th className="px-4 py-4">Notas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="border-b border-slate-100">
                                                {Array.from({ length: 5 }).map((_, j) => (
                                                    <td key={j} className="px-4 py-4">
                                                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : batches.length > 0 ? (
                                        batches.map((batch) => (
                                            <BatchRow
                                                key={batch.id}
                                                batch={batch}
                                                isExpanded={expandedIds.has(batch.id)}
                                                onToggle={() => toggleExpand(batch.id)}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-8 text-center text-slate-500"
                                            >
                                                No se encontraron movimientos.
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
            </Card>
        </div>
    );
};

// ---------------------------------------------------------------------------
// BatchRow
// ---------------------------------------------------------------------------

interface BatchRowProps {
    batch: MovementBatch;
    isExpanded: boolean;
    onToggle: () => void;
}

const BatchRow: React.FC<BatchRowProps> = ({ batch, isExpanded, onToggle }) => {
    const colors = MOVEMENT_TYPE_COLORS[batch.movement_type];
    const itemCount = batch.items?.length ?? 0;

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
                            {formatDate(batch.created_at)}
                        </span>
                        <span className="text-xs text-slate-400">
                            {formatTime(batch.created_at)}
                        </span>
                    </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3.5">
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.badge}`}
                    >
                        {batch.movement_type === 'in' ? (
                            <ArrowDownToLine size={12} />
                        ) : (
                            <ArrowUpFromLine size={12} />
                        )}
                        {MOVEMENT_TYPE_LABELS[batch.movement_type]}
                    </span>
                </td>

                {/* Products count */}
                <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Package size={14} className="text-slate-400" />
                        {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                    </span>
                </td>

                {/* Notes */}
                <td className="px-4 py-3.5">
                    <span className="text-slate-500 truncate block max-w-[300px]">
                        {batch.notes ?? '—'}
                    </span>
                </td>
            </tr>

            {/* Expanded detail rows */}
            {isExpanded && batch.items && (
                <tr>
                    <td colSpan={5} className="p-0">
                        <div className={`${colors.bg} border-b border-slate-200`}>
                            <div className="px-6 py-2">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-500 uppercase tracking-wide">
                                            <th className="text-left py-2 font-semibold">
                                                Producto
                                            </th>
                                            <th className="text-left py-2 font-semibold">
                                                Presentación
                                            </th>
                                            <th className="text-right py-2 font-semibold">
                                                Cantidad
                                            </th>
                                            <th className="text-right py-2 font-semibold">
                                                Stock anterior
                                            </th>
                                            <th className="text-right py-2 font-semibold">
                                                Stock nuevo
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batch.items.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-t border-slate-200/50"
                                            >
                                                <td className="py-2.5 text-slate-800 font-medium">
                                                    {item.product.code
                                                        ? `[${item.product.code}] `
                                                        : ''}
                                                    {item.product.name}
                                                </td>
                                                <td className="py-2.5 text-slate-500">
                                                    {item.presentation
                                                        ? item.presentation.name
                                                        : 'Unidad base'}
                                                </td>
                                                <td
                                                    className={`py-2.5 text-right font-semibold ${
                                                        batch.movement_type === 'in'
                                                            ? 'text-emerald-600'
                                                            : 'text-amber-600'
                                                    }`}
                                                >
                                                    {batch.movement_type === 'in'
                                                        ? `+${Number(item.quantity)}`
                                                        : `-${Number(item.quantity)}`}
                                                </td>
                                                <td className="py-2.5 text-right text-slate-500">
                                                    {Number(item.previous_stock)}
                                                </td>
                                                <td className="py-2.5 text-right font-medium text-slate-800">
                                                    {Number(item.new_stock)}
                                                </td>
                                            </tr>
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
