import { useState, useCallback } from 'react';
import { serviceService } from '../services/service';
import { useToast } from './useToast';
import { getErrorMessage } from '../utils/error';
import type {
    Service,
    CreateServicePayload,
    PatchServicePayload,
    ServiceQueryParams,
} from '../interfaces/service';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface UseServiceState {
    services: Service[];
    totalCount: number;
    isLoading: boolean;
    error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useService
 *
 * Custom hook that encapsulates all async CRUD logic for services:
 * - Fetching a paginated list of services
 * - Fetching a single service by ID
 * - Creating, updating (patch), and deleting services
 *
 * Mirrors the structure of `useProduct` and `useCategory` for consistency.
 * Provides unified loading state, error state, and toast notifications.
 */
export const useService = () => {
    const { showToast } = useToast();

    const [state, setState] = useState<UseServiceState>({
        services: [],
        totalCount: 0,
        isLoading: false,
        error: null,
    });

    const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));
    const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

    /**
     * Handles errors uniformly: sets error state, clears loading, shows a toast.
     */
    const handleError = (error: unknown, defaultMessage: string) => {
        const message = getErrorMessage(error, defaultMessage);
        setLoading(false);
        setError(message);
        showToast(message, 'error');
    };

    // ── GET list ──────────────────────────────────────────────────────────────

    /**
     * Fetches a paginated list of services.
     *
     * @param params - Optional query parameters for filtering, search, and ordering.
     */
    const fetchServices = useCallback(async (params?: ServiceQueryParams) => {
        setLoading(true);
        try {
            const { results, count } = await serviceService.getServices(params);
            setState({
                services: results ?? [],
                totalCount: count ?? 0,
                isLoading: false,
                error: null,
            });
        } catch (err) {
            handleError(err, 'Error al cargar los servicios.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── GET by ID ─────────────────────────────────────────────────────────────

    /**
     * Fetches a single service by its ID.
     *
     * @param id - The service's numeric ID.
     * @returns The service record, or null if not found / on error.
     */
    const fetchServiceById = useCallback(async (id: number): Promise<Service | null> => {
        setLoading(true);
        try {
            const service = await serviceService.getServiceById(id);
            setState((prev) => ({ ...prev, isLoading: false, error: null }));
            return service;
        } catch (err) {
            handleError(err, 'Error al cargar el servicio.');
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── POST ──────────────────────────────────────────────────────────────────

    /**
     * Creates a new service.
     * On success, prepends it to the local services list and shows a success toast.
     *
     * @param payload - Fields required to create the service.
     * @returns The created service, or null on error.
     */
    const addService = async (payload: CreateServicePayload): Promise<Service | null> => {
        setLoading(true);
        try {
            const created = await serviceService.createService(payload);
            setState((prev) => ({
                ...prev,
                services: [created, ...prev.services],
                totalCount: prev.totalCount + 1,
                isLoading: false,
                error: null,
            }));
            showToast('Servicio creado exitosamente.', 'success');
            return created;
        } catch (err) {
            handleError(err, 'Error al crear el servicio.');
            return null;
        }
    };

    // ── PATCH ─────────────────────────────────────────────────────────────────

    /**
     * Partially updates an existing service.
     * On success, updates the record in the local list and shows a success toast.
     *
     * @param id - The ID of the service to update.
     * @param payload - Fields to update.
     * @returns The updated service, or null on error.
     */
    const updateService = async (
        id: number,
        payload: PatchServicePayload,
    ): Promise<Service | null> => {
        setLoading(true);
        try {
            const updated = await serviceService.patchService(id, payload);
            setState((prev) => ({
                ...prev,
                services: prev.services.map((s) => (s.id === id ? updated : s)),
                isLoading: false,
                error: null,
            }));
            showToast('Servicio actualizado correctamente.', 'success');
            return updated;
        } catch (err) {
            handleError(err, 'Error al actualizar el servicio.');
            return null;
        }
    };

    // ── DELETE ────────────────────────────────────────────────────────────────

    /**
     * Soft-deletes a service.
     * On success, removes it from the local list and shows a success toast.
     *
     * @param id - The ID of the service to delete.
     * @returns True on success, false on error.
     */
    const deleteService = async (id: number, managerCode?: string): Promise<boolean> => {
        setLoading(true);
        try {
            await serviceService.deleteService(id, managerCode);
            setState((prev) => ({
                ...prev,
                services: prev.services.filter((s) => s.id !== id),
                totalCount: prev.totalCount - 1,
                isLoading: false,
                error: null,
            }));
            showToast('Servicio eliminado correctamente.', 'success');
            return true;
        } catch (err) {
            handleError(err, 'Error al eliminar el servicio.');
            return false;
        }
    };

    const { services, totalCount, isLoading, error } = state;

    return {
        services,
        totalCount,
        isLoading,
        error,
        fetchServices,
        fetchServiceById,
        addService,
        updateService,
        deleteService,
    };
};
