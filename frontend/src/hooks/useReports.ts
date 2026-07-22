import { useState, useCallback } from 'react';
import { reportService } from '../services/report';
import type { SalesReport, SalesReportParams } from '../interfaces/report';

export const useReports = () => {
    const [report, setReport] = useState<SalesReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async (params: SalesReportParams) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await reportService.getSalesReport(params);
            setReport(data);
        } catch {
            setError('Error al cargar el reporte de ventas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        report,
        isLoading,
        error,
        fetchReport,
    };
};
