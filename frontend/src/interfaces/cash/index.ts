export interface CashSessionMini {
    id: number;
    register_name: string;
    opened_at: string;
    status: CashSessionStatus;
}

export interface CashSessionClosure {
    id: number;
    session: number;
    closed_at: string;
    expected_amount: string;
    counted_amount: string;
    difference: string;
    notes: string;
}

export type CashSessionStatus = 'open' | 'suspended' | 'closed';

export type MovementType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

export interface CashRegister {
    id: number;
    name: string;
    branch: string;
    is_active: boolean;
    created_at: string;
}

import type { ReportGranularity } from '../report';

export interface CashMovement {
    id: number;
    cash_session: number;
    type: MovementType;
    type_display: string;
    amount: string;
    reason: string;
    created_by: number;
    created_by_name: string;
    created_at: string;
}

import type { Sale } from '../sale';

export interface CashSession {
    id: number;
    cash_register: number;
    cash_register_name: string;
    user: number;
    user_name: string;
    opening_amount: string;
    expected_amount: string;
    counted_amount: string | null;
    difference: string | null;
    status: CashSessionStatus;
    status_display: string;
    notes: string;
    opened_at: string;
    closed_at: string | null;
    suspended_at: string | null;
    movements: CashMovement[];
    sales?: Sale[];
    is_today: boolean;
}

export interface ActiveSessionResponse {
    id: number | null;
    status: CashSessionStatus | null;
    opened_at: string | null;
    user_id: number | null;
}

export interface CashSessionReport {
    id: number;
    cash_register: number;
    cash_register_name: string;
    user: number;
    user_name: string;
    opening_amount: string;
    expected_amount: string;
    counted_amount: string | null;
    difference: string | null;
    status: CashSessionStatus;
    notes: string;
    opened_at: string;
    closed_at: string | null;
    sales_count: number;
    sales_total: string;
    cash_sales_total: string;
    card_sales_total: string;
    transfer_sales_total: string;
    credit_sales_total: string;
    income_total: string;
    expense_total: string;
    movements_count: number;
}

/** Fila del historial de cajas cerradas. */
export interface ClosedCashSessionListItem {
    id: number;
    cash_register: number;
    cash_register_name: string;
    user: number;
    user_name: string;
    opening_amount: string;
    expected_amount: string;
    counted_amount: string | null;
    difference: string | null;
    status: CashSessionStatus;
    opened_at: string;
    closed_at: string | null;
    sales_count: number;
    sales_total: string;
}

export interface ClosedCashSessionParams {
    page?: number;
    page_size?: number;
    date_from?: string;
    date_to?: string;
    user_id?: number;
}

export interface CashSessionUserOption {
    id: number;
    name: string;
}

export interface OpenSessionPayload {
    cash_register_id?: number;
    opening_amount: string;
}

export interface CloseSessionPayload {
    counted_amount: string;
    notes?: string;
}

export interface CreateMovementPayload {
    cash_session: number;
    type: MovementType;
    amount: string;
    reason: string;
}

export interface CashRegisterQueryParams {
    is_active?: boolean;
}

// ---------------------------------------------------------------------------
// General Movements (ingresos/egresos generales del negocio)
// ---------------------------------------------------------------------------

export type GeneralMovementType = 'income' | 'expense';

export type GeneralMovementPaymentMethod = 'cash' | 'card' | 'transfer';

export interface GeneralMovement {
    id: number;
    type: GeneralMovementType;
    type_display: string;
    name: string;
    description: string;
    amount: string;
    date: string;
    payment_method: GeneralMovementPaymentMethod;
    payment_method_display: string;
    is_active: boolean;
    created_by: number;
    created_by_name: string;
    created_at: string;
    updated_at: string;
}

export interface CreateGeneralMovementPayload {
    type: GeneralMovementType;
    name: string;
    description?: string | null;
    amount: string;
    date: string;
    payment_method: GeneralMovementPaymentMethod;
}

export type UpdateGeneralMovementPayload = CreateGeneralMovementPayload;

export interface GeneralMovementQueryParams {
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
    type?: GeneralMovementType;
    payment_method?: GeneralMovementPaymentMethod;
    date_from?: string;
    date_to?: string;
}

export interface GeneralMovementSummaryParams {
    date_from?: string;
    date_to?: string;
    type?: GeneralMovementType;
    payment_method?: GeneralMovementPaymentMethod;
    granularity?: ReportGranularity;
}

export interface GeneralMovementPaymentRow {
    type: string;
    label: string;
    total: string;
}

export interface GeneralMovementPeriodPoint {
    period: string;
    income: string;
    expense: string;
}

export interface GeneralMovementSummary {
    total_income: string;
    total_expense: string;
    balance: string;
    count: number;
    by_payment: GeneralMovementPaymentRow[];
    by_period: GeneralMovementPeriodPoint[];
}
