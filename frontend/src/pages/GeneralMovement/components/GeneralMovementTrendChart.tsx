import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReportGranularity } from '@/interfaces/report';
import type { GeneralMovementPeriodPoint } from '@/interfaces/cash';
import { formatCurrency } from '@/utils/format';

interface GeneralMovementTrendChartProps {
    data: GeneralMovementPeriodPoint[];
    granularity: ReportGranularity;
}

const formatPeriodLabel = (period: string, granularity: ReportGranularity): string => {
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
    payload: {
        label: string;
        income: number;
        expense: number;
    };
}

const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[] }> = ({
    active,
    payload,
}) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-sm space-y-1">
            <p className="font-semibold text-slate-800">{point.label}</p>
            <p className="text-emerald-600 font-medium">
                Ingresos: <span className="font-bold">{formatCurrency(point.income)}</span>
            </p>
            <p className="text-rose-600 font-medium">
                Egresos: <span className="font-bold">{formatCurrency(point.expense)}</span>
            </p>
        </div>
    );
};

export const GeneralMovementTrendChart: React.FC<GeneralMovementTrendChartProps> = ({
    data,
    granularity,
}) => {
    const chartData = useMemo(
        () =>
            data.map((p) => ({
                label: formatPeriodLabel(p.period, granularity),
                income: parseFloat(p.income),
                expense: parseFloat(p.expense),
            })),
        [data, granularity],
    );

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                No hay movimientos en el período seleccionado.
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                    <span className="text-sm text-slate-600">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-rose-600" />
                    <span className="text-sm text-slate-600">Egresos</span>
                </div>
            </div>
            <div className="h-72 w-full min-w-0 overflow-hidden">
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
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#680a7d0d' }} />
                        <Bar
                            dataKey="income"
                            name="Ingresos"
                            fill="#059669"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        <Bar
                            dataKey="expense"
                            name="Egresos"
                            fill="#e11d48"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GeneralMovementTrendChart;
