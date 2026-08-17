import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { DataTable, type ColumnDef } from '../../components/ui/DataTable';
import { useClosedCashSessions } from '../../hooks/cash';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency } from '../../utils/format';
import { toISODate, addDays, resolvePreset } from '../../utils/dateRange';
import type { ReportPreset } from '../../interfaces/report';
import type { ClosedCashSessionListItem } from '../../interfaces/cash';
import { ClosedCashSessionFilters } from './components/ClosedCashSessionFilters';

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    const date = d.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
};

const differenceClass = (diff: string | null): string => {
    if (diff === null) return 'text-slate-400';
    const value = parseFloat(diff);
    if (value === 0) return 'text-emerald-600';
    return value > 0 ? 'text-blue-600' : 'text-rose-600';
};

export const ClosedCashSessionListPage: React.FC = () => {
    const navigate = useNavigate();
    const { pagination, setPage } = usePagination();
    const { currentPage, itemsPerPage } = pagination;

    const [preset, setPreset] = useState<ReportPreset>('today');
    const [customStart, setCustomStart] = useState<string>(toISODate(addDays(new Date(), -6)));
    const [customEnd, setCustomEnd] = useState<string>(toISODate(new Date()));
    const [userId, setUserId] = useState<number | null>(null);

    const params = useMemo(() => {
        const { start, end } = resolvePreset(preset, customStart, customEnd, 'day');
        return {
            page: currentPage,
            page_size: itemsPerPage,
            date_from: start,
            date_to: end,
            user_id: userId ?? undefined,
        };
    }, [currentPage, itemsPerPage, preset, customStart, customEnd, userId]);

    const { data, isLoading } = useClosedCashSessions(params);

    const handlePresetChange = (value: ReportPreset) => {
        setPreset(value);
        setPage(1);
    };

    const handleCustomStartChange = (value: string) => {
        setCustomStart(value);
        setPage(1);
    };

    const handleCustomEndChange = (value: string) => {
        setCustomEnd(value);
        setPage(1);
    };

    const handleUserIdChange = (id: number | null) => {
        setUserId(id);
        setPage(1);
    };

    const columns: ColumnDef<ClosedCashSessionListItem>[] = [
        {
            accessorKey: 'cash_register_name',
            header: 'Caja',
            cell: (row) => (
                <span className="font-medium text-slate-800">{row.cash_register_name}</span>
            ),
        },
        {
            accessorKey: 'user_name',
            header: 'Usuario',
            cell: (row) => row.user_name,
        },
        {
            accessorKey: 'opened_at',
            header: 'Apertura',
            cell: (row) => formatDateTime(row.opened_at),
        },
        {
            accessorKey: 'opening_amount',
            header: 'Apertura (C$)',
            cell: (row) => formatCurrency(row.opening_amount),
        },
        {
            accessorKey: 'sales_total',
            header: 'Ventas (C$)',
            cell: (row) => formatCurrency(row.sales_total),
        },
        {
            accessorKey: 'sales_count',
            header: 'N.º ventas',
            cell: (row) => String(row.sales_count),
        },
        {
            accessorKey: 'difference',
            header: 'Diferencia',
            cell: (row) =>
                row.difference === null ? (
                    <span className="text-slate-400">—</span>
                ) : (
                    <span className={`font-semibold ${differenceClass(row.difference)}`}>
                        {parseFloat(row.difference) >= 0 ? '+' : ''}
                        {formatCurrency(row.difference)}
                    </span>
                ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Historial de Cajas"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Historial de Cajas' }]}
            />

            <ClosedCashSessionFilters
                preset={preset}
                onPresetChange={handlePresetChange}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={handleCustomStartChange}
                onCustomEndChange={handleCustomEndChange}
                userId={userId}
                onUserIdChange={handleUserIdChange}
            />

            <Card>
                <DataTable
                    data={data?.results ?? []}
                    columns={columns}
                    serverSide
                    searchable={false}
                    isLoading={isLoading}
                    currentPage={currentPage}
                    totalCount={data?.count ?? 0}
                    onPageChange={setPage}
                    onRowClick={(row) => navigate(`/closed-cash-sessions/${row.id}`)}
                />
            </Card>
        </div>
    );
};
