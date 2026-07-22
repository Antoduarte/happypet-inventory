import { useCallback, useState } from 'react';
import type {
    Category,
    CategoryQueryParams,
    CreateCategoryPayload,
    UpdateCategoryPayload,
} from '../interfaces/category';
import { categoryService } from '../services/category';
import { getErrorMessage } from '../utils/error';

interface UseCategoriesState {
    categories: Category[];
    totalCount: number;
    isLoading: boolean;
    error: string | null;
}

export const useCategory = () => {
    const [state, setState] = useState<UseCategoriesState>({
        categories: [],
        totalCount: 0,
        isLoading: true,
        error: null,
    });

    const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));
    const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

    const fetchCategories = useCallback(async (params?: CategoryQueryParams) => {
        try {
            const res = await categoryService.getCategories(params);
            setState({
                categories: res.results || [],
                totalCount: res.count || 0,
                isLoading: false,
                error: null,
            });
        } catch (err) {
            const message = getErrorMessage(err, 'Error al cargar las categorías.');
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCategoryById = useCallback(async (id: number) => {
        try {
            const category = await categoryService.getCategoryById(id);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: null,
            }));
            return category;
        } catch (err) {
            const message = getErrorMessage(err, 'Error al cargar la categoría.');
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const addCategory = async (payload: CreateCategoryPayload) => {
        setLoading(true);
        try {
            const created = await categoryService.createCategory(payload);
            setState((prev) => ({
                ...prev,
                categories: [created, ...prev.categories],
                totalCount: prev.totalCount + 1,
                isLoading: false,
            }));
            return created;
        } catch (err) {
            const message = getErrorMessage(err, 'Error al crear la categoría.');
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateCategory = async (id: number, payload: UpdateCategoryPayload) => {
        setLoading(true);
        try {
            const updated = await categoryService.updateCategory(id, payload);
            setState((prev) => ({
                ...prev,
                categories: prev.categories.map((cat) => (cat.id === id ? updated : cat)),
                isLoading: false,
            }));
            return updated;
        } catch (err) {
            const message = getErrorMessage(err, 'Error al actualizar la categoría.');
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteCategory = async (id: number) => {
        setLoading(true);
        try {
            await categoryService.deleteCategory(id);
            setState((prev) => ({
                ...prev,
                categories: prev.categories.filter((cat) => cat.id !== id),
                totalCount: prev.totalCount - 1,
                isLoading: false,
            }));
        } catch (err) {
            const message = getErrorMessage(err, 'Error al eliminar la categoría.');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const { categories, isLoading, error, totalCount } = state;

    return {
        categories,
        isLoading,
        error,
        totalCount,
        fetchCategories,
        fetchCategoryById,
        addCategory,
        updateCategory,
        deleteCategory,
    };
};
