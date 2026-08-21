import React, { useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { CashReportFilters } from './components/CashReportFilters';
import { CashReportSummary } from './components/CashReportSummary';
import { CashReportTrendChart } from './components/CashReportTrendChart';
import { CashMovementsTable } from './components/CashMovementsTable';
import { useCashReport } from '../../hooks/cash';
import { useCashMovementFilters } from '../../hooks/cash/useCashMovementFilters';
import { usePagination } from '../../hooks/usePagination';
import type { ReportGranularity, ReportPreset } from '../../interfaces/report';
import type { MovementType } from '../../interfaces/cash';

/**
 * Cash report page.
 *
 * Displays aggregated cash movement income/expense for a period, together with
 * a trend chart and a paginated detail table. Accessible to admin and manager
 * roles only.
 */
export const CashReportPage: React.FC = () => {
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
        cashierId,
        setCashierId,
        reportParams,
        movementsParams,
    } = useCashMovementFilters();

    const { pagination, setPage, handleSearchChange, handleSortChange } = usePagination();

    const { report, isLoading, error, fetchReport } = useCashReport();

    useEffect(() => {
        fetchReport(reportParams);
    }, [reportParams, fetchReport]);

    const resetPage = () => setPage(1);

    const handlePresetChange = (value: ReportPreset) => {
        setPreset(value);
        resetPage();
    };

    const handleCustomStartChange = (value: string) => {
        setCustomStart(value);
        resetPage();
    };

    const handleCustomEndChange = (value: string) => {
        setCustomEnd(value);
        resetPage();
    };

    const handleGranularityChange = (value: ReportGranularity) => {
        setGranularity(value);
        resetPage();
    };

    const handleTypeChange = (value: '' | MovementType) => {
        setType(value);
        resetPage();
    };

    const handleCashierChange = (id: number | null) => {
        setCashierId(id);
        resetPage();
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Reporte de Caja"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Reporte de Caja' }]}
            />

            <CashReportFilters
                preset={preset}
                onPresetChange={handlePresetChange}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={handleCustomStartChange}
                onCustomEndChange={handleCustomEndChange}
                granularity={granularity}
                onGranularityChange={handleGranularityChange}
                selectedType={type}
                onTypeChange={handleTypeChange}
                selectedCashierId={cashierId}
                onCashierChange={handleCashierChange}
            />

            {error ? (
                <Card>
                    <p className="text-center text-slate-500 py-8">
                        Error al cargar el reporte de caja.
                    </p>
                </Card>
            ) : (
                <>
                    <CashReportSummary report={report ?? null} isLoading={isLoading} />

                    <Card title="Tendencia de Movimientos de Caja">
                        {isLoading || !report ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <CashReportTrendChart
                                data={report.by_period}
                                granularity={report.granularity}
                            />
                        )}
                    </Card>

                    <Card title="Movimientos de Caja">
                        <CashMovementsTable
                            params={movementsParams}
                            pagination={pagination}
                            onPageChange={setPage}
                            onSearchChange={handleSearchChange}
                            onSortChange={handleSortChange}
                        />
                    </Card>
                </>
            )}
        </div>
    );
};
