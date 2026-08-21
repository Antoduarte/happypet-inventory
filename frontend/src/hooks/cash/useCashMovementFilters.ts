import { useMemo, useState } from 'react';
import { resolvePreset, toISODate } from '../../utils/dateRange';
import type { ReportGranularity, ReportPreset } from '../../interfaces/report';
import type {
    CashReportParams,
    CashMovementQueryParams,
    MovementType,
} from '../../interfaces/cash';

/**
 * Manages the filter state for the cash report page.
 *
 * Returns preset-based date ranges, granularity, movement type and cashier
 * selection, together with derived param objects for the report and detail
 * table endpoints.
 */
export const useCashMovementFilters = () => {
    const [preset, setPreset] = useState<ReportPreset>('today');
    const [customStart, setCustomStart] = useState<string>(() => toISODate(new Date()));
    const [customEnd, setCustomEnd] = useState<string>(() => toISODate(new Date()));
    const [granularity, setGranularity] = useState<ReportGranularity>('day');
    const [type, setType] = useState<'' | MovementType>('');
    const [cashierId, setCashierId] = useState<number | null>(null);

    const dateRange = useMemo(
        () => resolvePreset(preset, customStart, customEnd, granularity),
        [preset, customStart, customEnd, granularity],
    );

    const reportParams = useMemo<CashReportParams>(
        () => ({
            start: dateRange.start,
            end: dateRange.end,
            granularity: dateRange.granularity,
            cashier_id: cashierId ?? undefined,
        }),
        [dateRange, cashierId],
    );

    const movementsParams = useMemo<CashMovementQueryParams>(
        () => ({
            date_from: dateRange.start,
            date_to: dateRange.end,
            type: type || undefined,
            cashier_id: cashierId ?? undefined,
        }),
        [dateRange, type, cashierId],
    );

    return {
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
        dateRange,
        reportParams,
        movementsParams,
    };
};
