import { useState, useCallback } from 'react';
import { saleService } from '../services/sale';
import { useToast } from './useToast';
import { getErrorMessage } from '../utils/error';
import { AppError } from '../services/errors';
import type {
    Sale,
    CreateSalePayload,
    PatchSalePayload,
    SaleQueryParams,
} from '../interfaces/sale';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface UseSaleState {
    sales: Sale[];
    totalCount: number;
    currentSale: Sale | null;
    isLoading: boolean;
    error: string | null;
    errorStatusCode: number | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useSale
 *
 * Custom hook that encapsulates all async CRUD logic for sales:
 * - Fetching a paginated list of sales
 * - Fetching a single sale by ID
 * - Creating, editing (patch), and deleting sales
 *
 * Mirrors the structure of `useProduct` and `useService` for consistency.
 * Provides unified loading state, error state, and toast notifications.
 */
export const useSale = () => {
    const { showToast } = useToast();

    const [state, setState] = useState<UseSaleState>({
        sales: [],
        totalCount: 0,
        currentSale: null,
        isLoading: false,
        error: null,
        errorStatusCode: null,
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));

    const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

    /**
     * Centralized error handler.
     * Sets the error state, clears loading, and shows an error toast.
     *
     * @param error - The caught error value.
     * @param defaultMessage - Fallback message when the error has no detail.
     */
    const handleError = (error: unknown, defaultMessage: string) => {
        const message = getErrorMessage(error, defaultMessage);
        const statusCode = error instanceof AppError ? error.statusCode : undefined;
        setLoading(false);
        setError(message);
        setState((prev) => ({ ...prev, errorStatusCode: statusCode ?? null }));
        showToast(message, 'error');
    };

    // ── GET list ──────────────────────────────────────────────────────────────

    /**
     * Fetches a paginated list of sales.
     * Replaces the current `sales` list with the API response.
     *
     * @param params - Optional query parameters for filtering, search, and ordering.
     */
    const fetchSales = useCallback(async (params?: SaleQueryParams) => {
        setLoading(true);
        try {
            const { results, count } = await saleService.getSales(params);
            setState({
                sales: results ?? [],
                totalCount: count ?? 0,
                currentSale: null,
                isLoading: false,
                error: null,
                errorStatusCode: null,
            });
        } catch (err) {
            handleError(err, 'Error loading sales.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── GET by ID ─────────────────────────────────────────────────────────────

    /**
     * Fetches a single sale by its ID.
     * Does not mutate the `sales` list.
     *
     * @param id - The sale's numeric ID.
     * @returns The sale record, or `null` if not found / on error.
     */
    const fetchSaleById = useCallback(async (id: number): Promise<Sale | null> => {
        setLoading(true);
        try {
            const sale = await saleService.getSaleById(id);
            setState((prev) => ({
                ...prev,
                currentSale: sale,
                isLoading: false,
                error: null,
                errorStatusCode: null,
            }));
            return sale;
        } catch (err) {
            handleError(err, 'Error loading the sale.');
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearCurrentSale = useCallback(() => {
        setState((prev) => ({
            ...prev,
            currentSale: null,
            error: null,
            errorStatusCode: null,
        }));
    }, []);

    // ── POST ──────────────────────────────────────────────────────────────────

    /**
     * Creates a new sale.
     * On success, prepends the record to the local list and shows a success toast.
     *
     * @param payload - Sale header and item list.
     * @returns The created sale, or `null` on error.
     */
    const addSale = async (payload: CreateSalePayload): Promise<Sale | null> => {
        setLoading(true);
        try {
            const created = await saleService.createSale(payload);
            setState((prev) => ({
                ...prev,
                sales: [created, ...prev.sales],
                totalCount: prev.totalCount + 1,
                isLoading: false,
                error: null,
            }));
            showToast('Sale created successfully.', 'success');
            return created;
        } catch (err) {
            handleError(err, 'Error creating the sale.');
            return null;
        }
    };

    // ── PATCH ─────────────────────────────────────────────────────────────────

    /**
     * Partially updates an existing sale.
     * On success, replaces the record in the local list and shows a success toast.
     *
     * @param id - The ID of the sale to update.
     * @param payload - Fields to update.
     * @returns The updated sale, or `null` on error.
     */
    const updateSale = async (id: number, payload: PatchSalePayload): Promise<Sale | null> => {
        setLoading(true);
        try {
            const updated = await saleService.patchSale(id, payload);
            setState((prev) => ({
                ...prev,
                sales: prev.sales.map((s) => (s.id === id ? updated : s)),
                isLoading: false,
                error: null,
            }));
            showToast('Sale updated successfully.', 'success');
            return updated;
        } catch (err) {
            handleError(err, 'Error updating the sale.');
            return null;
        }
    };

    /**
     * Thin wrapper to transition a sale's status.
     * On success, replaces the record in the local list and shows a success toast.
     *
     * @param id - The ID of the sale to update.
     * @param status - The target status ('completed' or 'cancelled').
     * @returns The updated sale, or `null` on error.
     */
    const updateSaleStatus = async (
        id: number,
        status: 'completed' | 'cancelled',
        managerCode?: string,
    ): Promise<Sale | null> => {
        setLoading(true);
        try {
            const updated = await saleService.patchSaleStatus(id, status, managerCode);
            setState((prev) => ({
                ...prev,
                sales: prev.sales.map((s) => (s.id === id ? updated : s)),
                currentSale: prev.currentSale?.id === id ? updated : prev.currentSale,
                isLoading: false,
                error: null,
            }));
            showToast('Sale status updated successfully.', 'success');
            return updated;
        } catch (err) {
            handleError(err, 'Error updating sale status.');
            return null;
        }
    };

    // ── DELETE ────────────────────────────────────────────────────────────────

    /**
     * Deletes a sale by its ID.
     * On success, removes the record from the local list and shows a success toast.
     *
     * @param id - The ID of the sale to delete.
     * @returns `true` on success, `false` on error.
     */
    const deleteSale = async (id: number): Promise<boolean> => {
        setLoading(true);
        try {
            await saleService.deleteSale(id);
            setState((prev) => ({
                ...prev,
                sales: prev.sales.filter((s) => s.id !== id),
                totalCount: prev.totalCount - 1,
                isLoading: false,
                error: null,
            }));
            showToast('Sale deleted successfully.', 'success');
            return true;
        } catch (err) {
            handleError(err, 'Error deleting the sale.');
            return false;
        }
    };

    // ── Return ────────────────────────────────────────────────────────────────

    const { sales, totalCount, currentSale, isLoading, error, errorStatusCode } = state;

    return {
        sales,
        totalCount,
        currentSale,
        isLoading,
        error,
        errorStatusCode,
        fetchSales,
        fetchSaleById,
        clearCurrentSale,
        addSale,
        updateSale,
        updateSaleStatus,
        deleteSale,
    };
};
