import React from 'react';
import { Calendar, CalendarDays, CalendarRange, Clock } from 'lucide-react';
import { Card } from './Card';
import { DateInput } from './DateInput';
import { TogglePills, type TogglePillOption } from './TogglePills';
import type { ReportGranularity, ReportPreset } from '../../interfaces/report';

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
    /** Optional preset list. Defaults to the standard presets. */
    presetOptions?: TogglePillOption<ReportPreset>[];
    /** Optional extra filter rendered next to the preset pills (e.g. seller filter). */
    sellerFilter?: React.ReactNode;
    /** Hides the "Agrupar por" granularity picker (used when no aggregation applies). */
    hideGranularity?: boolean;
}

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({
    preset,
    onPresetChange,
    customStart,
    customEnd,
    onCustomStartChange,
    onCustomEndChange,
    granularity,
    onGranularityChange,
    presetOptions,
    sellerFilter,
    hideGranularity = false,
}) => {
    const isCustom = preset === 'custom';

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <TogglePills<ReportPreset>
                        options={presetOptions ?? PRESET_OPTIONS}
                        value={preset}
                        onChange={onPresetChange}
                    />
                    {sellerFilter}
                </div>

                {isCustom && (
                    <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
                        <DateInput
                            compact
                            label="Desde"
                            value={customStart}
                            maxDate={customEnd || undefined}
                            onChange={onCustomStartChange}
                        />
                        <DateInput
                            compact
                            label="Hasta"
                            value={customEnd}
                            minDate={customStart || undefined}
                            onChange={onCustomEndChange}
                        />
                        {!hideGranularity && (
                            <TogglePills<ReportGranularity>
                                label="Agrupar por"
                                size="sm"
                                options={GRANULARITY_OPTIONS}
                                value={granularity}
                                onChange={onGranularityChange}
                            />
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default PeriodFilterBar;
