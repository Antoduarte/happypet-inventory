import { api } from './api';
import { AppError } from './errors';
import type {
    Sale,
    CreateSalePayload,
    UpdateSalePayload,
    PatchSalePayload,
    SaleQueryParams,
} from '../interfaces/sale';
import type { PaginatedResponse } from '../interfaces/product';

/** Base URL for the sales API endpoint. */
const SALES_URL = '/sales/';

/**
 * SaleService
 *
 * Encapsulates all API operations for the Sale resource.
 * Provides strongly-typed, Promise-based CRUD methods.
 * All network/HTTP errors are normalized to {@link AppError} instances
 * for consistent error handling across the application.
 */
class SaleService {
    /**
     * Retrieves a paginated list of sales.
     * Supports server-side search, ordering, and filtering via query params.
     *
     * @param params - Optional query parameters for filtering and pagination.
     * @returns A paginated response containing sale records.
     * @throws {AppError} On network error or non-2xx response.
     *
     * @example
     * const { results, count } = await saleService.getSales({ page: 1, page_size: 20 });
     */
    async getSales(params?: SaleQueryParams): Promise<PaginatedResponse<Sale>> {
        try {
            return await api.get<PaginatedResponse<Sale>>(SALES_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Retrieves a single sale by its ID.
     *
     * @param id - The unique numeric identifier of the sale.
     * @returns The full sale record including its line items.
     * @throws {AppError} If the record is not found or the request fails.
     *
     * @example
     * const sale = await saleService.getSaleById(5);
     */
    async getSaleById(id: number): Promise<Sale> {
        try {
            return await api.get<Sale>(`${SALES_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Creates a new sale with its line items.
     * The backend atomically validates stock, deducts inventory,
     * and computes totals for each item.
     *
     * @param payload - Sale header and item list to create.
     * @returns The newly created sale record.
     * @throws {AppError} On validation error or network failure.
     *
     * @example
     * const sale = await saleService.createSale({
     *   items: [{ product_id: 1, quantity: 2 }],
     *   payment_type: 'cash',
     * });
     */
    async createSale(payload: CreateSalePayload): Promise<Sale> {
        try {
            return await api.post<Sale>(SALES_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Fully replaces an existing sale (PUT).
     *
     * @param id - The ID of the sale to replace.
     * @param payload - Complete set of fields to write.
     * @returns The updated sale record.
     * @throws {AppError} On validation error or network failure.
     *
     * @example
     * const updated = await saleService.updateSale(5, { items: [...], payment_type: 'card' });
     */
    async updateSale(id: number, payload: UpdateSalePayload): Promise<Sale> {
        try {
            return await api.put<Sale>(`${SALES_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Partially updates an existing sale (PATCH).
     * Only the fields included in the payload will be modified.
     *
     * @param id - The ID of the sale to update.
     * @param payload - Partial set of fields to update.
     * @returns The updated sale record.
     * @throws {AppError} On validation error or network failure.
     *
     * @example
     * const updated = await saleService.patchSale(5, { status: 'completed' });
     */
    async patchSale(id: number, payload: PatchSalePayload): Promise<Sale> {
        try {
            return await api.patch<Sale>(`${SALES_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Thin wrapper to transition a sale's status (PATCH).
     *
     * @param id - The ID of the sale to update.
     * @param status - The target status ('completed' or 'cancelled').
     * @returns The updated sale record.
     * @throws {AppError} On validation error or network failure.
     *
     * @example
     * const updated = await saleService.patchSaleStatus(5, 'completed');
     */
    async patchSaleStatus(
        id: number,
        status: 'completed' | 'cancelled',
        managerCode?: string,
    ): Promise<Sale> {
        return this.patchSale(id, managerCode ? { status, manager_code: managerCode } : { status });
    }

    /**
     * Deletes a sale by its ID.
     * Whether this performs a hard or soft delete depends on the backend implementation.
     *
     * @param id - The ID of the sale to delete.
     * @throws {AppError} If the record is not found or the request fails.
     *
     * @example
     * await saleService.deleteSale(5);
     */
    async deleteSale(id: number): Promise<void> {
        try {
            await api.delete<void>(`${SALES_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

/**
 * Singleton instance of {@link SaleService}.
 * Import this instead of instantiating the class directly.
 */
export const saleService = new SaleService();
