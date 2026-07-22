import { useState, useCallback } from 'react';
import { reportService } from '../services/report';
import type { SaleDetailRow, SalesDetailParams } from '../interfaces/report';

export const useSalesDetail = () => {
    const [sales, setSales] = useState<SaleDetailRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = useCallback(async (params: SalesDetailParams) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await reportService.getSalesDetail(params);
            setSales(data.results);
            setTotalCount(data.count);
        } catch {
            setError('Error al cargar el detalle de ventas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { sales, totalCount, isLoading, error, fetchDetail };
};
