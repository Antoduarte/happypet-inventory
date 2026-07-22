import React from 'react';
import { Calendar, CalendarDays, CalendarRange, Clock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { TogglePills, type TogglePillOption } from '../../../components/ui/TogglePills';
import type { ReportGranularity } from '../../../interfaces/report';

export type ReportPreset = 'today' | 'week' | 'month' | 'custom';

const PRESET_OPTIONS: TogglePillOption<ReportPreset>[] = [
    { value: 'today', label: 'Hoy', icon: Clock },
    { value: 'week', label: 'Semana', icon: CalendarDays },
    { value: 'month', label: 'Mes', icon: Calendar },
    { value: 'custom', label: 'Rango', icon: CalendarRange },
];

const GRANULARITY_OPTIONS: TogglePillOption<ReportGranularity>[] = [
    { value: 'day', label: 'Diario' },
    { value: 'week', label: 'Semanal' },
    { value: 'month', label: 'Mensual' },
];

interface PeriodFilterBarProps {
    preset: ReportPreset;
    onPresetChange: (preset: ReportPreset) => void;
    customStart: string;
    customEnd: string;
    onCustomStartChange: (value: string) => void;
    onCustomEndChange: (value: string) => void;
    granularity: ReportGranularity;
    onGranularityChange: (value: ReportGranularity) => void;
    /** Optional extra filter rendered next to the preset pills (e.g. seller filter). */
    sellerFilter?: React.ReactNode;
}

const dateInputClass =
    'block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 ' +
    'focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none';

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({
    preset,
    onPresetChange,
    customStart,
    customEnd,
    onCustomStartChange,
    onCustomEndChange,
    granularity,
    onGranularityChange,
    sellerFilter,
}) => {
    const isCustom = preset === 'custom';

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <TogglePills<ReportPreset>
                        options={PRESET_OPTIONS}
                        value={preset}
                        onChange={onPresetChange}
                    />
                    {sellerFilter}
                </div>

                {isCustom && (
                    <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-500">Desde</label>
                            <input
                                type="date"
                                value={customStart}
                                max={customEnd || undefined}
                                onChange={(e) => onCustomStartChange(e.target.value)}
                                className={dateInputClass}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-500">Hasta</label>
                            <input
                                type="date"
                                value={customEnd}
                                min={customStart || undefined}
                                onChange={(e) => onCustomEndChange(e.target.value)}
                                className={dateInputClass}
                            />
                        </div>
                        <TogglePills<ReportGranularity>
                            label="Agrupar por"
                            size="sm"
                            options={GRANULARITY_OPTIONS}
                            value={granularity}
                            onChange={onGranularityChange}
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
