import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DataTable, type ColumnDef } from '../../../components/ui/DataTable';
import { formatCurrency } from '../../../utils/format';
import { useCashMovements } from '../../../hooks/cash';
import type { PaginationState } from '../../../hooks/usePagination';
import type { CashMovement, CashMovementQueryParams, MovementType } from '../../../interfaces/cash';

const TYPE_LABELS: Record<MovementType, string> = {
    income: 'Ingreso',
    expense: 'Egreso',
};

interface CashMovementsTableProps {
    params: CashMovementQueryParams;
    pagination: Pick<PaginationState, 'currentPage' | 'itemsPerPage' | 'search' | 'ordering'>;
    onPageChange: (page: number) => void;
    onSearchChange: (term: string) => void;
    onSortChange: (key: string, direction: 'asc' | 'desc') => void;
}

/**
 * Paginated table that lists cash movements matching the provided filters.
 * Pagination lives in the parent (CashReportPage) so that filters can reset it.
 */
export const CashMovementsTable: React.FC<CashMovementsTableProps> = ({
    params,
    pagination,
    onPageChange,
    onSearchChange,
    onSortChange,
}) => {
    const { currentPage, itemsPerPage, search, ordering } = pagination;

    const queryParams = useMemo(
        () => ({
            ...params,
            page: currentPage,
            page_size: itemsPerPage,
            search: search || undefined,
            ordering: ordering || undefined,
        }),
        [params, currentPage, itemsPerPage, search, ordering],
    );

    const { data, isLoading } = useCashMovements(queryParams);

    const movements = data?.results ?? [];
    const totalCount = data?.count ?? 0;

    const columns: ColumnDef<CashMovement>[] = useMemo(
        () => [
            {
                header: 'Tipo',
                accessorKey: 'type',
                sortable: true,
                cell: (item) => (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.type === 'income'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                        }`}
                    >
                        {item.type === 'income' ? (
                            <TrendingUp size={12} />
                        ) : (
                            <TrendingDown size={12} />
                        )}
                        {TYPE_LABELS[item.type]}
                    </span>
                ),
            },
            {
                header: 'Monto',
                accessorKey: 'amount',
                sortable: true,
                cell: (item) => (
                    <span
                        className={`font-semibold ${
                            item.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                    >
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount)}
                    </span>
                ),
            },
            {
                header: 'Motivo',
                accessorKey: 'reason',
                cell: (item) => (
                    <span className="text-slate-600 truncate max-w-[240px] block">
                        {item.reason || '—'}
                    </span>
                ),
            },
            {
                header: 'Caja',
                accessorKey: 'cash_session',
                cell: (item) => <span className="text-slate-600">#{item.cash_session}</span>,
            },
            {
                header: 'Registrado por',
                accessorKey: 'created_by_name',
                cell: (item) => <span className="text-slate-600">{item.created_by_name}</span>,
            },
            {
                header: 'Fecha',
                accessorKey: 'created_at',
                sortable: true,
                cell: (item) => (
                    <span className="text-slate-600">
                        {new Date(item.created_at).toLocaleString('es-NI', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <DataTable
            data={movements}
            columns={columns}
            searchKey="reason"
            searchPlaceholder="Buscar por motivo..."
            isLoading={isLoading}
            serverSide
            itemsPerPage={itemsPerPage}
            totalCount={totalCount}
            currentPage={currentPage}
            onPageChange={onPageChange}
            onSearchChange={onSearchChange}
            onSortChange={onSortChange}
        />
    );
};
