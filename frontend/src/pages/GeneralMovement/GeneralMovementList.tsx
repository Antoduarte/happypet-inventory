import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, ChartNoAxesCombined } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { MetricCard } from '@/components/ui/MetricCard';
import { PaymentMethodBreakdown } from '@/components/ui/PaymentMethodBreakdown';
import { useGeneralMovements, useGeneralMovementSummary } from '@/hooks/cash';
import { useGeneralMovementFilters } from '@/hooks/cash/useGeneralMovementFilters';
import { usePagination } from '@/hooks/usePagination';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from '@/utils/format';
import { getPaymentTypeLabel } from '@/utils/payment';
import { GeneralMovementFilters } from './components/GeneralMovementFilters';
import { GeneralMovementTrendChart } from './components/GeneralMovementTrendChart';
import type { GeneralMovement } from '@/interfaces/cash';

const TYPE_LABELS: Record<string, string> = {
    income: 'Ingreso',
    expense: 'Egreso',
};

export const GeneralMovementList: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin } = usePermission();

    const { pagination, setPage, handleSearchChange, handleSortChange } = usePagination();
    const { currentPage, itemsPerPage, search, ordering } = pagination;

    const {
        preset,
        setPreset,
        customStart,
        setCustomStart,
        customEnd,
        setCustomEnd,
        granularity,
        setGranularity,
        type,
        setType,
        paymentMethod,
        setPaymentMethod,
        dateRange,
        summaryParams,
    } = useGeneralMovementFilters();

    const { data, isLoading } = useGeneralMovements({
        page: currentPage,
        page_size: itemsPerPage,
        search,
        ordering,
        type: type || undefined,
        payment_method: paymentMethod || undefined,
        date_from: dateRange.start,
        date_to: dateRange.end,
    });

    const {
        data: summary,
        isLoading: isSummaryLoading,
        error: summaryError,
    } = useGeneralMovementSummary(summaryParams);

    const resetPage = () => setPage(1);

    const handleTypeChange = (value: '' | GeneralMovement['type']) => {
        setType(value);
        resetPage();
    };

    const handlePaymentMethodChange = (value: '' | GeneralMovement['payment_method']) => {
        setPaymentMethod(value);
        resetPage();
    };

    const handlePresetChange = (value: typeof preset) => {
        setPreset(value);
        resetPage();
    };

    const handleGranularityChange = (value: typeof granularity) => {
        setGranularity(value);
        resetPage();
    };

    const movements = useMemo(() => data?.results ?? [], [data]);
    const totalCount = data?.count ?? 0;

    const columns: ColumnDef<GeneralMovement>[] = useMemo(
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
                        {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                ),
            },
            {
                header: 'Nombre',
                accessorKey: 'name',
                sortable: true,
                cell: (item) => <span className="font-medium text-slate-800">{item.name}</span>,
            },
            {
                header: 'Descripción',
                accessorKey: 'description',
                cell: (item) => (
                    <span className="text-slate-500 truncate max-w-[200px] block">
                        {item.description || '—'}
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
                header: 'Método',
                accessorKey: 'payment_method',
                sortable: true,
                cell: (item) => (
                    <span className="text-slate-600">
                        {getPaymentTypeLabel(item.payment_method)}
                    </span>
                ),
            },
            {
                header: 'Fecha',
                accessorKey: 'date',
                sortable: true,
                cell: (item) => (
                    <span className="text-slate-600">
                        {new Date(item.date).toLocaleDateString('es', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </span>
                ),
            },
            {
                header: 'Registrado por',
                accessorKey: 'created_by_name',
                cell: (item) => <span className="text-slate-600">{item.created_by_name}</span>,
            },
        ],
        [],
    );

    return (
        <div className="space-y-5">
            <PageHeader
                title="Ingresos y Egresos"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Ingresos y Egresos' }]}
                action={
                    isAdmin && (
                        <Button
                            onClick={() => navigate('/general-movements/new')}
                            className="gap-2"
                        >
                            <Plus size={18} />
                            Nuevo movimiento
                        </Button>
                    )
                }
            />

            <GeneralMovementFilters
                preset={preset}
                onPresetChange={handlePresetChange}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={(v) => {
                    setCustomStart(v);
                    resetPage();
                }}
                onCustomEndChange={(v) => {
                    setCustomEnd(v);
                    resetPage();
                }}
                granularity={granularity}
                onGranularityChange={handleGranularityChange}
                selectedType={type}
                onTypeChange={handleTypeChange}
                selectedPaymentMethod={paymentMethod}
                onPaymentMethodChange={handlePaymentMethodChange}
            />

            {summaryError ? (
                <Card>
                    <p className="text-center text-slate-500 py-8">
                        {summaryError instanceof Error
                            ? summaryError.message
                            : String(summaryError)}
                    </p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <MetricCard
                            label="Ingresos"
                            value={summary ? formatCurrency(summary.total_income) : '—'}
                            icon={TrendingUp}
                            iconBg="bg-emerald-100"
                            iconColor="text-emerald-600"
                            isLoading={isSummaryLoading}
                        />
                        <MetricCard
                            label="Egresos"
                            value={summary ? formatCurrency(summary.total_expense) : '—'}
                            icon={TrendingDown}
                            iconBg="bg-rose-100"
                            iconColor="text-rose-600"
                            isLoading={isSummaryLoading}
                        />
                        <MetricCard
                            label="Resultado neto"
                            value={summary ? formatCurrency(summary.balance) : '—'}
                            icon={ChartNoAxesCombined}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                            isLoading={isSummaryLoading}
                        />
                    </div>
                    <Card>
                        <DataTable
                            data={movements}
                            columns={columns}
                            searchKey="name"
                            searchPlaceholder="Buscar por nombre o descripción..."
                            isLoading={isLoading}
                            serverSide
                            itemsPerPage={itemsPerPage}
                            totalCount={totalCount}
                            currentPage={currentPage}
                            onPageChange={setPage}
                            onSearchChange={handleSearchChange}
                            onSortChange={handleSortChange}
                            onRowClick={(item: GeneralMovement) =>
                                navigate(`/general-movements/edit/${item.id}`)
                            }
                        />
                    </Card>

                    <Card title="Métodos de Pago">
                        {isSummaryLoading || !summary ? (
                            <div className="h-24 animate-pulse bg-slate-100 rounded-xl" />
                        ) : (
                            <PaymentMethodBreakdown data={summary.by_payment} />
                        )}
                    </Card>

                    <Card title="Tendencia de Movimientos">
                        {isSummaryLoading || !summary ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <GeneralMovementTrendChart
                                data={summary.by_period}
                                granularity={dateRange.granularity}
                            />
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};
