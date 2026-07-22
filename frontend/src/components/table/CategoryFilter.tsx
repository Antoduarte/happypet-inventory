import React, { useCallback } from 'react';
import { Tag } from 'lucide-react';
import { SelectFilter, type SelectFilterProps } from '@/components/ui/SelectFilter';
import { categoryService } from '@/services/category';
import type { CategoryType } from '@/interfaces/category';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryFilterProps extends Pick<
    SelectFilterProps,
    'selectedId' | 'onChange' | 'className'
> {
    /**
     * Filter by category type when fetching from the API.
     * Defaults to 'product'.
     */
    categoryType?: CategoryType;
    /** Overrides the trigger button placeholder. Defaults to "Categoría". */
    placeholder?: string;
    /** Overrides the "all" option label. Defaults to "Todas las categorías". */
    allLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CategoryFilter
 *
 * A thin wrapper over `SelectFilter` that sources its options from the
 * category API. Use `SelectFilter` directly for non-category use cases.
 *
 * @example
 * ```tsx
 * <CategoryFilter
 *   selectedId={selectedCategoryId}
 *   onChange={handleCategoryChange}
 *   categoryType="product"
 * />
 * ```
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
    selectedId,
    onChange,
    categoryType = 'product',
    placeholder = 'Categoría',
    allLabel = 'Todas las categorías',
    className,
}) => {
    const fetchOptions = useCallback(async () => {
        try {
            const res = await categoryService.getCategories({
                type: categoryType,
                page_size: 100,
            });
            return {
                options: res.results.map((c) => ({ id: c.id, label: c.name })),
            };
        } catch {
            return { options: [], error: 'No se pudieron cargar las categorías.' };
        }
    }, [categoryType]);

    return (
        <SelectFilter
            filterId={`category-filter-${categoryType}`}
            selectedId={selectedId}
            onChange={onChange}
            fetchOptions={fetchOptions}
            placeholder={placeholder}
            allLabel={allLabel}
            ariaLabel="Seleccionar categoría"
            icon={Tag}
            className={className}
        />
    );
};

export default CategoryFilter;
