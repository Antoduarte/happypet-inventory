import { api } from './api';
import { AppError } from './errors';
import type {
    Product,
    CreateProductPayload,
    UpdateProductPayload,
    PatchProductPayload,
    PaginatedResponse,
    ProductQueryParams,
} from '../interfaces/product';

// ---------------------------------------------------------------------------
// Constantes de rutas
// ---------------------------------------------------------------------------

const PRODUCTS_URL = '/products/';

// ---------------------------------------------------------------------------
// ProductService
//
// Centraliza toda la lógica de consumo de la API de productos.
// Cada método representa una operación CRUD clara y reutilizable.
// Las excepciones de red/HTTP se normalizan a AppError para un manejo
// uniforme en los componentes.
// ---------------------------------------------------------------------------

class ProductService {
    // -----------------------------------------------------------------------
    // Productos
    // -----------------------------------------------------------------------

    /**
     * Obtiene la lista de productos.
     * Soporta búsqueda y ordenamiento via query params.
     *
     * GET /api/products/
     */
    async getProducts(params?: ProductQueryParams): Promise<PaginatedResponse<Product>> {
        try {
            return await api.get<PaginatedResponse<Product>>(PRODUCTS_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Obtiene el detalle de un producto por su ID.
     *
     * GET /api/products/{id}/
     */
    async getProductById(id: number): Promise<Product> {
        try {
            return await api.get<Product>(`${PRODUCTS_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Crea un nuevo producto.
     *
     * POST /api/products/
     */
    async createProduct(payload: CreateProductPayload): Promise<Product> {
        try {
            return await api.post<Product>(PRODUCTS_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Reemplaza completamente un producto existente (actualización completa).
     *
     * PUT /api/products/{id}/
     */
    async updateProduct(id: number, payload: UpdateProductPayload): Promise<Product> {
        try {
            return await api.put<Product>(`${PRODUCTS_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Actualiza parcialmente un producto (solo los campos enviados).
     *
     * PATCH /api/products/{id}/
     */
    async patchProduct(id: number, payload: PatchProductPayload): Promise<Product> {
        try {
            return await api.patch<Product>(`${PRODUCTS_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Elimina un producto por su ID.
     *
     * DELETE /api/products/{id}/
     */
    async deleteProduct(id: number, managerCode?: string): Promise<void> {
        try {
            // DELETE no lleva body; el código de autorización va como query param.
            await api.delete<void>(
                `${PRODUCTS_URL}${id}/`,
                managerCode ? { params: { manager_code: managerCode } } : undefined,
            );
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

export const productService = new ProductService();
