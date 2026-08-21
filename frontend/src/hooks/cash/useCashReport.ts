import { useState, useCallback } from 'react';
import { cashReportService } from '../../services/cash';
import type { CashReport, CashReportParams } from '../../interfaces/cash';

/**
 * Fetches the cash report without React Query.
 *
 * Keeps a stable reference to the loaded report until the next successful
 * fetch, mirroring the sales report pattern (useReports). This avoids the
 * re-render cascade triggered by React Query's stale/refetch behavior combined
 * with the responsive chart.
 */
export const useCashReport = () => {
    const [report, setReport] = useState<CashReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async (params: CashReportParams) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await cashReportService.getCashReport(params);
            setReport(data);
        } catch {
            setError('Error al cargar el reporte de caja');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { report, isLoading, error, fetchReport };
};
