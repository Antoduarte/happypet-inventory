/**
 * Category Interfaces
 *
 * Types and interfaces for Category entities, synchronized with backend serializers.
 */

/**
 * Valid types for a Category.
 */
export type CategoryType = 'product' | 'service';

/**
 * Represents a Category entity.
 */
export interface Category {
    /** Unique identifier for the category */
    id: number;
    /** Display name of the category */
    name: string;
    /** Detailed description (can be null) */
    description: string | null;
    /** The type of category (product or service) */
    type: CategoryType;
    /** Status of the category */
    is_active: boolean;
}

/**
 * Payload for creating a new Category.
 */
export interface CreateCategoryPayload {
    /** Name of the new category */
    name: string;
    /** Description for the new category */
    description?: string | null;
    /** Type of the new category (defaults to 'product' in backend) */
    type?: CategoryType;
    /** Status of the category */
    is_active?: boolean;
}

/**
 * Payload for full Category update (PUT).
 */
export type UpdateCategoryPayload = CreateCategoryPayload;

/**
 * Payload for partial Category update (PATCH).
 */
export type PatchCategoryPayload = Partial<CreateCategoryPayload>;

/**
 * Query parameters for category listing, filtering, and ordering.
 */
export interface CategoryQueryParams {
    /** Search term for filtering by name */
    search?: string;
    /** Field name for ordering (e.g., 'name', '-id') */
    ordering?: string;
    /** Page number for pagination */
    page?: number;
    /** Number of items per page */
    page_size?: number;
    /** Filter by category type ('product' or 'service') */
    type?: 'product' | 'service';
}
