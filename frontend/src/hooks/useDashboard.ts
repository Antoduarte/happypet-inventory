import { useState, useCallback } from 'react';
import { dashboardService, type DashboardStats } from '../services/dashboard';

export const useDashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await dashboardService.getStats();
            setStats(data);
        } catch {
            setError('Error al cargar las estadísticas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        stats,
        isLoading,
        error,
        fetchStats,
    };
};
