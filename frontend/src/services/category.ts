import { api } from './api';
import { AppError } from './errors';
import type {
    Category,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    PatchCategoryPayload,
    CategoryQueryParams,
} from '../interfaces/category';
import type { PaginatedResponse } from '../interfaces/product';

/**
 * Constant for the categories endpoint.
 */
const CATEGORIES_URL = '/categories/';

/**
 * CategoryService
 *
 * Encapsulates all API operations for Category management.
 * Provides clean, type-safe methods for CRUD operations.
 * Normalizes all network/HTTP errors into AppError instances.
 */
class CategoryService {
    /**
     * Retrieves a list of categories.
     * Supports filtering via search and ordering through query parameters.
     *
     * @param params - Query parameters for filtering and pagination.
     * @returns A promise that resolves to a paginated response of categories.
     * @throws {AppError} If the request fails.
     */
    async getCategories(params?: CategoryQueryParams): Promise<PaginatedResponse<Category>> {
        try {
            return await api.get<PaginatedResponse<Category>>(CATEGORIES_URL, { params });
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Retrieves the details of a specific category by its ID.
     *
     * @param id - The unique identifier of the category.
     * @returns A promise that resolves to the category details.
     * @throws {AppError} If the category is not found or the request fails.
     */
    async getCategoryById(id: number): Promise<Category> {
        try {
            return await api.get<Category>(`${CATEGORIES_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Creates a new category.
     *
     * @param payload - The data for the new category.
     * @returns A promise that resolves to the newly created category.
     * @throws {AppError} If the data is invalid or the request fails.
     */
    async createCategory(payload: CreateCategoryPayload): Promise<Category> {
        try {
            return await api.post<Category>(CATEGORIES_URL, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Fully updates an existing category.
     *
     * @param id - The unique identifier of the category to update.
     * @param payload - The new data for the category.
     * @returns A promise that resolves to the updated category.
     * @throws {AppError} If the data is invalid or the request fails.
     */
    async updateCategory(id: number, payload: UpdateCategoryPayload): Promise<Category> {
        try {
            return await api.put<Category>(`${CATEGORIES_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Partially updates an existing category.
     *
     * @param id - The unique identifier of the category to update.
     * @param payload - The partial data to update.
     * @returns A promise that resolves to the updated category.
     * @throws {AppError} If the data is invalid or the request fails.
     */
    async patchCategory(id: number, payload: PatchCategoryPayload): Promise<Category> {
        try {
            return await api.patch<Category>(`${CATEGORIES_URL}${id}/`, payload);
        } catch (error) {
            throw AppError.from(error);
        }
    }

    /**
     * Deletes a category by its ID.
     *
     * @param id - The unique identifier of the category to delete.
     * @returns A promise that resolves when the deletion is successful.
     * @throws {AppError} If the request fails.
     */
    async deleteCategory(id: number): Promise<void> {
        try {
            await api.delete<void>(`${CATEGORIES_URL}${id}/`);
        } catch (error) {
            throw AppError.from(error);
        }
    }
}

/**
 * Singleton instance of CategoryService.
 */
export const categoryService = new CategoryService();
