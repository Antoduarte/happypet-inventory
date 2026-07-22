/**
 * Service Interfaces
 *
 * Strictly typed definitions aligned with the backend `Service` model
 * and `ServiceSerializer`. Used across the service layer, hooks, and components.
 */

import type { Category } from './category';

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

export interface Service {
    id: number;
    name: string;
    description: string | null;
    /** Serialized as a string by DRF DecimalField */
    price: string;
    is_active: boolean;
    /** Nested read-only category object (null when no category is assigned) */
    category: Category | null;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/** Payload for creating a new service (POST /api/services/) */
export interface CreateServicePayload {
    name: string;
    description?: string | null;
    price: string | number;
    is_active?: boolean;
    /** Write-only FK: ID of the category to assign */
    category_id?: number | null;
    /** Código de autorización de manager/admin. El backend lo exige solo para cajeros. */
    manager_code?: string;
}

/** Payload for a full replacement (PUT /api/services/{id}/) */
export type UpdateServicePayload = CreateServicePayload;

/** Payload for a partial update (PATCH /api/services/{id}/) */
export type PatchServicePayload = Partial<CreateServicePayload>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export interface ServiceQueryParams {
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    /** Filter by category ID */
    category?: number | null;
    /** Filter by active status */
    is_active?: boolean;
}
