export type ReportGranularity = 'day' | 'week' | 'month';

export interface SalesReportParams {
    start?: string; // YYYY-MM-DD
    end?: string; // YYYY-MM-DD
    granularity?: ReportGranularity;
    cashier_id?: number;
}

export interface ReportSummary {
    total_income: string;
    sales_count: number;
    avg_ticket: string;
    products_income: string;
    products_count: number;
    services_income: string;
    services_count: number;
}

export interface ReportPeriodPoint {
    period: string; // YYYY-MM-DD
    total: string;
    count: number;
}

export interface ReportPaymentRow {
    type: string;
    label: string;
    total: string;
}

export interface ReportCashierRow {
    user_id: number | null;
    name: string;
    total: string;
    count: number;
}

export interface SellerOption {
    id: number;
    name: string;
}

/** A single line inside a ticket of the sales detail report. */
export interface SaleDetailItem {
    id: number;
    type: 'product' | 'service';
    /** True when the line is a supply consumed by a parent service line. */
    is_supply: boolean;
    name: string;
    quantity: string;
    price_per_item: string;
    total_price: string;
    discount_percentage: number;
    surcharge_percentage: number;
}

/** Ticket-level row of the sales detail report (nested items included). */
export interface SaleDetailRow {
    id: number;
    sale_date: string;
    payment_type: string;
    seller_name: string;
    subtotal: string;
    total_price: string;
    discount_percentage: number;
    surcharge_percentage: number;
    items: SaleDetailItem[];
}

export interface SalesDetailParams {
    start?: string;
    end?: string;
    cashier_id?: number;
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
}

export interface SalesReport {
    granularity: ReportGranularity;
    start: string;
    end: string;
    summary: ReportSummary;
    by_period: ReportPeriodPoint[];
    by_payment: ReportPaymentRow[];
    by_cashier: ReportCashierRow[];
}
