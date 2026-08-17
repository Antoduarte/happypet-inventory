import type { ReportGranularity, ReportPreset } from '../interfaces/report';

export const toISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const addDays = (d: Date, days: number): Date => {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
};

export interface ResolvedDateRange {
    start: string;
    end: string;
    granularity: ReportGranularity;
}

export const resolvePreset = (
    preset: ReportPreset,
    customStart: string,
    customEnd: string,
    customGranularity: ReportGranularity,
): ResolvedDateRange => {
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
