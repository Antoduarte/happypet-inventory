import { useMemo, useState } from 'react';
import { resolvePreset, toISODate } from '../../utils/dateRange';
import type { ReportGranularity, ReportPreset } from '../../interfaces/report';
import type {
    GeneralMovementPaymentMethod,
    GeneralMovementSummaryParams,
    GeneralMovementType,
} from '../../interfaces/cash';

export const useGeneralMovementFilters = () => {
    const [preset, setPreset] = useState<ReportPreset>('today');
    const [customStart, setCustomStart] = useState<string>(() => toISODate(new Date()));
    const [customEnd, setCustomEnd] = useState<string>(() => toISODate(new Date()));
    const [granularity, setGranularity] = useState<ReportGranularity>('day');
    const [type, setType] = useState<'' | GeneralMovementType>('');
    const [paymentMethod, setPaymentMethod] = useState<'' | GeneralMovementPaymentMethod>('');

    const dateRange = useMemo(
        () => resolvePreset(preset, customStart, customEnd, granularity),
        [preset, customStart, customEnd, granularity],
    );

    const summaryParams = useMemo<GeneralMovementSummaryParams>(
        () => ({
            date_from: dateRange.start,
            date_to: dateRange.end,
            type: type || undefined,
            payment_method: paymentMethod || undefined,
            granularity: dateRange.granularity,
        }),
        [dateRange, type, paymentMethod],
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
        paymentMethod,
        setPaymentMethod,
        dateRange,
        summaryParams,
    };
};
