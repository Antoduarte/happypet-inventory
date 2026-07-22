import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Boxes,
    ClipboardList,
    Download,
    Package,
    Scissors,
    ShoppingBag,
    TrendingUp,
    User,
    type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectFilter } from '../../components/ui/SelectFilter';
import { useReports } from '../../hooks/useReports';
import { usePermission } from '../../hooks/usePermission';
import { reportService } from '../../services/report';
import { formatCurrency } from '../../utils/format';
import { exportSalesDetailCsv } from '../../utils/exportCsv';
import type { ReportGranularity } from '../../interfaces/report';
import { PeriodFilterBar, type ReportPreset } from './components/PeriodFilterBar';
import { SalesTrendChart } from './components/SalesTrendChart';
import { PaymentBreakdown } from './components/PaymentBreakdown';
import { SalesDetailTable } from './components/SalesDetailTable';

const toISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const addDays = (d: Date, days: number): Date => {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
};

interface ResolvedParams {
    start: string;
    end: string;
    granularity: ReportGranularity;
}

const resolvePreset = (
    preset: ReportPreset,
    customStart: string,
    customEnd: string,
    customGranularity: ReportGranularity,
): ResolvedParams => {
    const today = new Date();
    const todayIso = toISODate(today);

    switch (preset) {
        case 'today':
            return { start: todayIso, end: todayIso, granularity: 'day' };
        case 'week':
            return { start: toISODate(addDays(today, -6)), end: todayIso, granularity: 'day' };
        case 'month':
            return {
                start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
                end: todayIso,
                granularity: 'day',
            };
        case 'custom':
            return {
                start: customStart || todayIso,
                end: customEnd || todayIso,
                granularity: customGranularity,
            };
    }
};

export const ReportsPage: React.FC = () => {
    const { isCashier } = usePermission();
    const { report, isLoading, error, fetchReport } = useReports();

    const [preset, setPreset] = useState<ReportPreset>('today');
    const [customStart, setCustomStart] = useState<string>(toISODate(addDays(new Date(), -6)));
    const [customEnd, setCustomEnd] = useState<string>(toISODate(new Date()));
    const [customGranularity, setCustomGranularity] = useState<ReportGranularity>('day');
    // null = all sellers (default)
    const [sellerId, setSellerId] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Cashiers are locked to today's data; the backend enforces this too.
    const effectivePreset: ReportPreset = isCashier ? 'today' : preset;

    const params = useMemo(
        () => ({
            ...resolvePreset(effectivePreset, customStart, customEnd, customGranularity),
            cashier_id: sellerId ?? undefined,
        }),
        [effectivePreset, customStart, customEnd, customGranularity, sellerId],
    );

    useEffect(() => {
        fetchReport(params);
    }, [params, fetchReport]);

    const fetchSellerOptions = useCallback(async () => {
        try {
            const sellers = await reportService.getSellers();
            return { options: sellers.map((s) => ({ id: s.id, label: s.name })) };
        } catch {
            return { options: [], error: 'Error al cargar los vendedores' };
        }
    }, []);

    const handleExportDetail = async () => {
        setIsExporting(true);
        try {
            const rows = await reportService.getAllSalesDetail({
                start: params.start,
                end: params.end,
                cashier_id: sellerId ?? undefined,
            });
            exportSalesDetailCsv(rows, params.start, params.end);
        } catch {
            // Silent: the detail table already surfaces fetch errors on screen.
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Reportes de Ventas"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Reportes' }]}
            />

            {isCashier ? (
                <p className="text-sm text-slate-500">
                    Mostrando las ventas de hoy de tus sesiones de caja.
                </p>
            ) : (
                <PeriodFilterBar
                    preset={preset}
                    onPresetChange={setPreset}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomStartChange={setCustomStart}
                    onCustomEndChange={setCustomEnd}
                    granularity={customGranularity}
                    onGranularityChange={setCustomGranularity}
                    sellerFilter={
                        <SelectFilter
                            filterId="seller"
                            placeholder="Vendedor"
                            allLabel="Todos los vendedores"
                            icon={User}
                            ariaLabel="Filtrar por vendedor"
                            selectedId={sellerId}
                            onChange={setSellerId}
                            fetchOptions={fetchSellerOptions}
                        />
                    }
                />
            )}

            {error ? (
                <Card>
                    <p className="text-center text-slate-500 py-8">{error}</p>
                </Card>
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <SummaryCard
                            label="Ingresos totales"
                            value={report ? formatCurrency(report.summary.total_income) : '—'}
                            icon={TrendingUp}
                            isLoading={isLoading}
                        />
                        <SummaryCard
                            label="N.º de ventas"
                            value={report ? String(report.summary.sales_count) : '—'}
                            icon={ShoppingBag}
                            isLoading={isLoading}
                        />
                        <SummaryCard
                            label="Ingresos por productos"
                            value={report ? formatCurrency(report.summary.products_income) : '—'}
                            icon={Package}
                            isLoading={isLoading}
                        />
                        <SummaryCard
                            label="Productos vendidos"
                            value={report ? String(report.summary.products_count) : '—'}
                            icon={Boxes}
                            isLoading={isLoading}
                        />
                        <SummaryCard
                            label="Ingresos por servicios"
                            value={report ? formatCurrency(report.summary.services_income) : '—'}
                            icon={Scissors}
                            isLoading={isLoading}
                        />
                        <SummaryCard
                            label="Servicios aplicados"
                            value={report ? String(report.summary.services_count) : '—'}
                            icon={ClipboardList}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Trend */}
                    <Card title="Tendencia de Ventas">
                        {isLoading || !report ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <SalesTrendChart
                                data={report.by_period}
                                granularity={report.granularity}
                            />
                        )}
                    </Card>

                    {/* Payment breakdown */}
                    <Card title="Desglose por Método de Pago">
                        {isLoading || !report ? (
                            <div className="h-24 animate-pulse bg-slate-100 rounded-xl" />
                        ) : (
                            <PaymentBreakdown data={report.by_payment} />
                        )}
                    </Card>

                    {/* Sales detail (ticket-level, expandable) */}
                    <Card
                        title="Detalle de Ventas"
                        action={
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleExportDetail}
                                isLoading={isExporting}
                            >
                                <Download size={16} className="mr-1.5" />
                                {isExporting ? 'Exportando…' : 'Exportar CSV'}
                            </Button>
                        }
                    >
                        <SalesDetailTable
                            start={params.start}
                            end={params.end}
                            sellerId={sellerId}
                        />
                    </Card>
                </>
            )}
        </div>
    );
};

interface SummaryCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    isLoading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon: Icon, isLoading }) => (
    <Card>
        <div className="flex items-center gap-4">
            <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand/10 text-brand">
                <Icon size={24} />
            </span>
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                {isLoading ? (
                    <div className="h-7 w-24 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                )}
            </div>
        </div>
    </Card>
);
