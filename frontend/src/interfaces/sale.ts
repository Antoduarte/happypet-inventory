/**
 * Sale Interfaces
 *
 * Strictly typed definitions aligned with the backend `Sale` and `SaleItem`
 * models and their respective serializers.
 * Used across the sale service layer, hooks, and components.
 */

import type { Product } from './product';
import type { Service } from './service';
import type { PaginatedResponse } from './product';
import type { CashSessionMini } from './cash';

// Re-export for convenience
export type { PaginatedResponse };

// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

/** Valid discount / surcharge step values accepted by the backend. */
export type DiscountPercentage = 0 | 5 | 10 | 15 | 20 | 25 | 30;

/** Sale payment method options. */
export type PaymentType = 'cash' | 'card' | 'transfer' | 'qr' | 'credit';

/** Sale lifecycle statuses. */
export type SaleStatus = 'pending' | 'completed' | 'cancelled';

/** Whether a sale item is a product or a service. */
export type SaleItemType = 'product' | 'service';

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

/** A single line item inside a Sale, as returned by the API. */
export interface SaleItem {
    id: number;
    /** Nested product object (null when the item is a service). */
    product: Product | null;
    /** Selected presentation at time of sale. */
    presentation: import('./product').ProductPresentation | null;
    /** Historical snapshot fields preserved regardless of future catalog changes. */
    presentation_name: string;
    presentation_price_snapshot: string;
    presentation_multiplier_snap: string;
    /** Nested service object (null when the item is a product). */
    service: Service | null;
    /** Parent service item when this is a supply (null otherwise). */
    parent_service_item: number | null;
    type: SaleItemType;
    quantity: string;
    /** Unit price at the time of sale. Serialized as string by DRF DecimalField. */
    price_per_item: string;
    /** Line subtotal before adjustments. Serialized as string. */
    subtotal: string;
    /** Final line total after discount / surcharge. Serialized as string. */
    total_price: string;
    discount_percentage: DiscountPercentage;
    surcharge_percentage: DiscountPercentage;
    surcharge_reason: string | null;
}

/** Full Sale record as returned by the API (GET). */
export interface Sale {
    id: number;
    /** Associated cash session (null if sale is not linked to a session). */
    cash_session: CashSessionMini | null;
    /** Total number of line items. */
    quantity: number;
    /** Order grand total. Serialized as string by DRF DecimalField. */
    total_price: string;
    /** Order subtotal before global adjustments. Serialized as string. */
    subtotal: string;
    discount_percentage: DiscountPercentage;
    surcharge_percentage: DiscountPercentage;
    surcharge_reason: string | null;
    status: SaleStatus;
    payment_type: PaymentType;
    /** ISO 8601 datetime string (auto-set on creation). */
    sale_date: string;
    items: SaleItem[];
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/** Write payload for a single sale item (POST / PUT). */
export interface SaleItemPayload {
    /** Product FK – required when `type` is "product". */
    product_id?: number | null;
    /** Presentation FK – optional, required when selling by presentation. */
    presentation_id?: number | null;
    /** Service FK – required when `type` is "service". */
    service_id?: number | null;
    type?: SaleItemType;
    quantity: number;
    discount_percentage?: DiscountPercentage;
    surcharge_percentage?: DiscountPercentage;
    surcharge_reason?: string | null;
    /** Optional flag indicating this item is a service supply (not counted in totals). */
    is_supply?: boolean;
}

/** Payload for creating a new sale (POST /api/sales/). */
export interface CreateSalePayload {
    cash_session_id?: number | null;
    items: SaleItemPayload[];
    discount_percentage?: DiscountPercentage;
    surcharge_percentage?: DiscountPercentage;
    surcharge_reason?: string | null;
    status?: SaleStatus;
    payment_type?: PaymentType;
    /** Código de autorización de manager/admin. El backend lo exige a cajeros para cancelar. */
    manager_code?: string;
}

/** Payload for a full replacement (PUT /api/sales/{id}/). */
export type UpdateSalePayload = CreateSalePayload;

/** Payload for a partial update (PATCH /api/sales/{id}/). */
export type PatchSalePayload = Partial<CreateSalePayload>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

/** Supported query parameters for the sales list endpoint. */
export interface SaleQueryParams {
    /** Full-text search across related fields. */
    search?: string;
    /** Field to order by (e.g. "-sale_date", "total_price"). */
    ordering?: string;
    /** Page number for pagination. */
    page?: number;
    /** Number of results per page. */
    page_size?: number;
    /** Filter by sale status. */
    status?: SaleStatus;
    /** Filter by payment type. */
    payment_type?: PaymentType;
}
