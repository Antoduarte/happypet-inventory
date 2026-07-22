/**
 * usePresentation
 *
 * Hook que encapsula toda la lógica async de CRUD de presentaciones de producto.
 * Exposición:
 *   - presentations: lista en memoria (filtrada por el último fetch)
 *   - totalCount, isLoading, error
 *   - fetchPresentations(params?)   → carga la lista
 *   - fetchPresentationById(id)     → detalle por id
 *   - addPresentation(payload)      → POST
 *   - updatePresentation(id, patch) → PATCH
 *   - deletePresentation(id)        → DELETE
 */

import { useState, useCallback } from 'react';
import { presentationService } from '../services/presentation';
import { useToast } from './useToast';
import { getErrorMessage } from '../utils/error';
import type {
    ProductPresentation,
    CreatePresentationPayload,
    PatchPresentationPayload,
    PresentationQueryParams,
} from '../interfaces/product';

interface UsePresentationState {
    presentations: ProductPresentation[];
    totalCount: number;
    isLoading: boolean;
    error: string | null;
}

export const usePresentation = () => {
    const { showToast } = useToast();

    const [state, setState] = useState<UsePresentationState>({
        presentations: [],
        totalCount: 0,
        isLoading: false,
        error: null,
    });

    const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));
    const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

    const handleError = (err: unknown, defaultMessage: string) => {
        const message = getErrorMessage(err, defaultMessage);
        setLoading(false);
        setError(message);
        showToast(message, 'error');
    };

    const fetchPresentations = useCallback(
        async (params?: PresentationQueryParams): Promise<ProductPresentation[]> => {
            setLoading(true);
            try {
                const { results, count } = await presentationService.getPresentations(params);
                setState({
                    presentations: results || [],
                    totalCount: count || 0,
                    isLoading: false,
                    error: null,
                });
                return results || [];
            } catch (err) {
                handleError(err, 'Error al cargar las presentaciones.');
                return [];
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const fetchPresentationById = useCallback(
        async (id: number): Promise<ProductPresentation | null> => {
            setLoading(true);
            try {
                const presentation = await presentationService.getPresentationById(id);
                setState((prev) => ({ ...prev, isLoading: false, error: null }));
                return presentation;
            } catch (err) {
                handleError(err, 'Error al cargar la presentación.');
                return null;
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const addPresentation = async (
        payload: CreatePresentationPayload,
    ): Promise<ProductPresentation | null> => {
        setLoading(true);
        try {
            const created = await presentationService.createPresentation(payload);
            setState((prev) => ({
                ...prev,
                presentations: [created, ...prev.presentations],
                totalCount: prev.totalCount + 1,
                isLoading: false,
            }));
            showToast('Presentación creada exitosamente.', 'success');
            return created;
        } catch (err) {
            handleError(err, 'Error al crear la presentación.');
            return null;
        }
    };

    const updatePresentation = async (
        id: number,
        payload: PatchPresentationPayload,
    ): Promise<ProductPresentation | null> => {
        setLoading(true);
        try {
            const updated = await presentationService.patchPresentation(id, payload);
            setState((prev) => ({
                ...prev,
                presentations: prev.presentations.map((p) => (p.id === id ? updated : p)),
                isLoading: false,
            }));
            showToast('Presentación actualizada correctamente.', 'success');
            return updated;
        } catch (err) {
            handleError(err, 'Error al actualizar la presentación.');
            return null;
        }
    };

    const deletePresentation = async (id: number): Promise<boolean> => {
        setLoading(true);
        try {
            await presentationService.deletePresentation(id);
            setState((prev) => ({
                ...prev,
                presentations: prev.presentations.filter((p) => p.id !== id),
                totalCount: prev.totalCount - 1,
                isLoading: false,
            }));
            showToast('Presentación eliminada correctamente.', 'success');
            return true;
        } catch (err) {
            handleError(err, 'Error al eliminar la presentación.');
            return false;
        }
    };

    const { presentations, totalCount, isLoading, error } = state;

    return {
        presentations,
        totalCount,
        isLoading,
        error,
        fetchPresentations,
        fetchPresentationById,
        addPresentation,
        updatePresentation,
        deletePresentation,
    };
};
