import { api } from './api';

export interface DashboardStats {
    total_products: number;
    today_income: string;
    low_stock_count: number;
    today_services: number;
}

class DashboardService {
    async getStats(): Promise<DashboardStats> {
        try {
            return await api.get<DashboardStats>('/dashboard/');
        } catch (error) {
            throw error;
        }
    }
}

export const dashboardService = new DashboardService();
