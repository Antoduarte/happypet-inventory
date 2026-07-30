import { api } from './api';

export interface DashboardStats {
    total_products: number;
    today_income: string;
    pending_credit_total: string;
    pending_credit_count: number;
    low_stock_count: number;
    today_services: number;
}

class DashboardService {
    async getStats(): Promise<DashboardStats> {
        return api.get<DashboardStats>('/dashboard/');
    }
}

export const dashboardService = new DashboardService();
