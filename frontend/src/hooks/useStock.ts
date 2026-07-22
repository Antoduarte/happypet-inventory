import { useState, useCallback } from 'react';
import { stockService } from '../services/stock';
import { useToast } from './useToast';
import { getErrorMessage } from '../utils/error';
import type {
    MovementBatch,
    CreateMovementPayload,
    MovementBatchQueryParams,
} from '../interfaces/product';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface UseStockState {
    batches: MovementBatch[];
    totalCount: number;
    isLoading: boolean;
    error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useStock
 *
 * Custom hook for inventory movement batch operations:
 * - Fetching a paginated list of batches
 * - Fetching a single batch by ID
 * - Creating a new batch (stock in / stock out)
 */
export const useStock = () => {
    const { showToast } = useToast();

    const [state, setState] = useState<UseStockState>({
        batches: [],
        totalCount: 0,
        isLoading: false,
        error: null,
    });

    const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));

    const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

    const handleError = (error: unknown, defaultMessage: string) => {
        const message = getErrorMessage(error, defaultMessage);
        setLoading(false);
        setError(message);
        showToast(message, 'error');
    };

    // ── GET list (batches) ───────────────────────────────────────────────────

    const fetchBatches = useCallback(async (params?: MovementBatchQueryParams) => {
        setLoading(true);
        try {
            const { results, count } = await stockService.getBatches(params);
            setState({
                batches: results ?? [],
                totalCount: count ?? 0,
                isLoading: false,
                error: null,
            });
        } catch (err) {
            handleError(err, 'Error al cargar los movimientos de stock.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── GET by ID ────────────────────────────────────────────────────────────

    const fetchBatchById = useCallback(async (id: number): Promise<MovementBatch | null> => {
        setLoading(true);
        try {
            const batch = await stockService.getBatchById(id);
            setState((prev) => ({ ...prev, isLoading: false, error: null }));
            return batch;
        } catch (err) {
            handleError(err, 'Error al cargar el movimiento.');
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── POST ─────────────────────────────────────────────────────────────────

    const createMovement = async (
        payload: CreateMovementPayload,
    ): Promise<MovementBatch | null> => {
        setLoading(true);
        try {
            const batch = await stockService.createBatch(payload);
            setState((prev) => ({
                ...prev,
                batches: [batch, ...prev.batches],
                totalCount: prev.totalCount + 1,
                isLoading: false,
                error: null,
            }));
            const itemCount = batch.items?.length ?? 1;
            showToast(
                itemCount > 1
                    ? `${itemCount} movimientos registrados correctamente.`
                    : 'Movimiento registrado correctamente.',
                'success',
            );
            return batch;
        } catch (err) {
            handleError(err, 'Error al registrar el movimiento.');
            return null;
        }
    };

    const { batches, totalCount, isLoading, error } = state;

    return {
        batches,
        totalCount,
        isLoading,
        error,
        fetchBatches,
        fetchBatchById,
        createMovement,
    };
};
