import { api } from './api';
import type {
    SaleDetailRow,
    SalesDetailParams,
    SellerOption,
    SalesReport,
    SalesReportParams,
} from '../interfaces/report';
import type { PaginatedResponse } from '../interfaces/sale';

class ReportService {
    async getSalesReport(params: SalesReportParams): Promise<SalesReport> {
        return await api.get<SalesReport>('/reports/sales/', { params });
    }

    async getSellers(): Promise<SellerOption[]> {
        return await api.get<SellerOption[]>('/reports/sellers/');
    }

    async getSalesDetail(params: SalesDetailParams): Promise<PaginatedResponse<SaleDetailRow>> {
        return await api.get<PaginatedResponse<SaleDetailRow>>('/reports/sales/detail/', {
            params,
        });
    }

    /** Fetches every detail row matching the filters, walking all pages. */
    async getAllSalesDetail(params: SalesDetailParams): Promise<SaleDetailRow[]> {
        const rows: SaleDetailRow[] = [];
        let page = 1;
        // Backend caps page_size at 1000 (StandardResultsSetPagination).
        const pageSize = 1000;

        for (;;) {
            const data = await this.getSalesDetail({ ...params, page, page_size: pageSize });
            rows.push(...data.results);
            if (!data.next) break;
            page += 1;
        }

        return rows;
    }
}

export const reportService = new ReportService();
