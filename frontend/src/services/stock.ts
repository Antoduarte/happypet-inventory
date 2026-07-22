import { api } from './api';
import { AppError } from './errors';
import type {
    InventoryMovement,
    MovementBatch,
    CreateMovementPayload,
    MovementQueryParams,
    MovementBatchQueryParams,
    PaginatedResponse,
} from '../interfaces/product';

/**
 * Base URLs for inventory API endpoints.
 */
const MOVEMENTS_URL = '/inventory-movements/';
const BATCHES_URL = '/movement-batches/';

/**
 * StockService
 *
 * Encapsulates all API operations related to inventory stock movements.
 * Provides strongly-typed, Promise-based methods for reading and recording
 * stock transactions.
 */
class StockService {
    /**
     * Retrieves a paginated list of individual inventory movements.
     * Useful for filtering by product regardless of batch.
     */
    async getMovements(
        params?: MovementQueryParams,
    ): Promise<PaginatedResponse<InventoryMovement>> {
        try {
            return await api.get<PaginatedResponse<InventoryMovement>>(MOVEMENTS_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Retrieves a single inventory movement by its ID.
     */
    async getMovementById(id: number): Promise<InventoryMovement> {
        try {
            return await api.get<InventoryMovement>(`${MOVEMENTS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Retrieves a paginated list of movement batches.
     * Each batch contains nested items (individual movements).
     */
    async getBatches(params?: MovementBatchQueryParams): Promise<PaginatedResponse<MovementBatch>> {
        try {
            return await api.get<PaginatedResponse<MovementBatch>>(BATCHES_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Retrieves a single movement batch by its ID.
     */
    async getBatchById(id: number): Promise<MovementBatch> {
        try {
            return await api.get<MovementBatch>(`${BATCHES_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Creates a new movement batch with one or more items.
     * The backend atomically adjusts stock for all products.
     */
    async createBatch(payload: CreateMovementPayload): Promise<MovementBatch> {
        try {
            return await api.post<MovementBatch>(BATCHES_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

/**
 * Singleton instance of StockService.
 */
export const stockService = new StockService();
