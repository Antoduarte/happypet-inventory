import React, { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { ReportGranularity, ReportPeriodPoint } from '../../../interfaces/report';
import { formatCurrency } from '../../../utils/format';

interface SalesTrendChartProps {
    data: ReportPeriodPoint[];
    granularity: ReportGranularity;
}

const formatPeriodLabel = (period: string, granularity: ReportGranularity): string => {
    // period is YYYY-MM-DD; parse as local date to avoid TZ shifts.
    const [y, m, d] = period.split('-').map(Number);
    const date = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (granularity === 'month') {
        return date.toLocaleDateString('es-NI', { month: 'short', year: 'numeric' });
    }
    if (granularity === 'week') {
        return `Sem. ${date.toLocaleDateString('es-NI', { day: '2-digit', month: 'short' })}`;
    }
    return date.toLocaleDateString('es-NI', { day: '2-digit', month: 'short' });
};

interface TooltipEntry {
    payload: { total: number; count: number; label: string };
}

const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[] }> = ({
    active,
    payload,
}) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-sm">
            <p className="font-semibold text-slate-800">{point.label}</p>
            <p className="text-brand font-bold">{formatCurrency(point.total)}</p>
            <p className="text-xs text-slate-400">{point.count} ventas</p>
        </div>
    );
};

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data, granularity }) => {
    const chartData = useMemo(
        () =>
            data.map((p) => ({
                label: formatPeriodLabel(p.period, granularity),
                total: parseFloat(p.total),
                count: p.count,
            })),
        [data, granularity],
    );

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                No hay ventas en el período seleccionado.
            </div>
        );
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickFormatter={(v: number) => `C$ ${v.toLocaleString('es-NI')}`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#2E236C0d' }} />
                    <Bar dataKey="total" fill="#2E236C" radius={[6, 6, 0, 0]} maxBarSize={64} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
