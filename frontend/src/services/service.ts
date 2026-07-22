import { api } from './api';
import { AppError } from './errors';
import type {
    Service,
    CreateServicePayload,
    UpdateServicePayload,
    PatchServicePayload,
    ServiceQueryParams,
} from '../interfaces/service';
import type { PaginatedResponse } from '../interfaces/product';

/** Base URL for the services API endpoint. */
const SERVICES_URL = '/services/';

/**
 * ServiceService
 *
 * Encapsulates all API operations for the Service resource.
 * Provides strongly-typed, Promise-based CRUD methods.
 * All network/HTTP errors are normalized to AppError instances
 * for consistent error handling across the application.
 */
class ServiceService {
    /**
     * Retrieves a paginated list of services.
     * Supports server-side search, ordering, and filtering via query params.
     *
     * @param params - Optional query parameters for filtering and pagination.
     * @returns A paginated response containing service records.
     * @throws {AppError} On network error or non-2xx response.
     *
     * @example
     * const { results, count } = await serviceService.getServices({ page: 1, page_size: 20 });
     */
    async getServices(params?: ServiceQueryParams): Promise<PaginatedResponse<Service>> {
        try {
            return await api.get<PaginatedResponse<Service>>(SERVICES_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Retrieves a single service by its ID.
     *
     * @param id - The unique numeric identifier of the service.
     * @returns The service record.
     * @throws {AppError} If the record is not found or the request fails.
     *
     * @example
     * const service = await serviceService.getServiceById(3);
     */
    async getServiceById(id: number): Promise<Service> {
        try {
            return await api.get<Service>(`${SERVICES_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Creates a new service.
     *
     * @param payload - Fields required to create the service.
     * @returns The newly created service record.
     * @throws {AppError} On validation error or network failure.
     *
     * @example
     * const service = await serviceService.createService({ name: 'Bath', price: 25 });
     */
    async createService(payload: CreateServicePayload): Promise<Service> {
        try {
            return await api.post<Service>(SERVICES_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Fully replaces an existing service (PUT).
     *
     * @param id - The ID of the service to update.
     * @param payload - Complete set of fields to write.
     * @returns The updated service record.
     * @throws {AppError} On validation error or network failure.
     */
    async updateService(id: number, payload: UpdateServicePayload): Promise<Service> {
        try {
            return await api.put<Service>(`${SERVICES_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Partially updates an existing service (PATCH).
     * Only the fields included in the payload will be modified.
     *
     * @param id - The ID of the service to update.
     * @param payload - Partial set of fields to update.
     * @returns The updated service record.
     * @throws {AppError} On validation error or network failure.
     *
     * @example
     * const updated = await serviceService.patchService(3, { price: 30 });
     */
    async patchService(id: number, payload: PatchServicePayload): Promise<Service> {
        try {
            return await api.patch<Service>(`${SERVICES_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Soft-deletes a service (sets `is_active = false` on the backend).
     *
     * @param id - The ID of the service to delete.
     * @throws {AppError} If the record is not found or the request fails.
     */
    async deleteService(id: number, managerCode?: string): Promise<void> {
        try {
            // DELETE no lleva body; el código de autorización va como query param.
            await api.delete<void>(
                `${SERVICES_URL}${id}/`,
                managerCode ? { params: { manager_code: managerCode } } : undefined,
            );
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

/**
 * Singleton instance of ServiceService.
 * Import this instead of instantiating the class directly.
 */
export const serviceService = new ServiceService();
