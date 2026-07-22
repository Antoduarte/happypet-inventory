/**
 * PresentationService
 *
 * Centraliza toda la lógica de consumo del endpoint /api/product-presentations/.
 * Cada método representa una operación CRUD clara con tipado fuerte.
 */

import { api } from './api';
import { AppError } from './errors';
import type {
    ProductPresentation,
    CreatePresentationPayload,
    PatchPresentationPayload,
    PaginatedResponse,
    PresentationQueryParams,
} from '../interfaces/product';

const PRESENTATIONS_URL = '/product-presentations/';

class PresentationService {
    /**
     * Lista presentaciones. Soporta filtrado por producto y búsqueda.
     * GET /api/product-presentations/
     */
    async getPresentations(
        params?: PresentationQueryParams,
    ): Promise<PaginatedResponse<ProductPresentation>> {
        try {
            return await api.get<PaginatedResponse<ProductPresentation>>(PRESENTATIONS_URL, {
                params,
            });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Detalle de una presentación.
     * GET /api/product-presentations/{id}/
     */
    async getPresentationById(id: number): Promise<ProductPresentation> {
        try {
            return await api.get<ProductPresentation>(`${PRESENTATIONS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Crea una nueva presentación.
     * POST /api/product-presentations/
     */
    async createPresentation(payload: CreatePresentationPayload): Promise<ProductPresentation> {
        try {
            return await api.post<ProductPresentation>(PRESENTATIONS_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Actualización parcial de una presentación.
     * PATCH /api/product-presentations/{id}/
     */
    async patchPresentation(
        id: number,
        payload: PatchPresentationPayload,
    ): Promise<ProductPresentation> {
        try {
            return await api.patch<ProductPresentation>(`${PRESENTATIONS_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Elimina (soft-delete via is_active=false) una presentación.
     * DELETE /api/product-presentations/{id}/
     */
    async deletePresentation(id: number): Promise<void> {
        try {
            await api.delete<void>(`${PRESENTATIONS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

export const presentationService = new PresentationService();
