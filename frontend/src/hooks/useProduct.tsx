import { useState, useCallback } from 'react';
import { productService } from '../services/product';
import { useToast } from './useToast';
import type {
    Product,
    CreateProductPayload,
    PatchProductPayload,
    ProductQueryParams,
} from '../interfaces/product';
import { getErrorMessage } from '../utils/error';

export type { Product };

interface UseProductsState {
    products: Product[];
    totalCount: number;
    isLoading: boolean;
    error: string | null;
}

/**
 * useProduct
 *
 * Encapsula toda la lógica asíncrona de CRUD de productos:
 * - Fetch inicial desde la API
 * - Creación, actualización parcial y eliminación
 * - Estados de carga y error
 * - Feedback visual a través del sistema de Toast
 */
export const useProduct = () => {
    const { showToast } = useToast();

    const [state, setState] = useState<UseProductsState>({
        products: [],
        totalCount: 0,
        isLoading: false,
        error: null,
    });

    const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));

    const setError = (error: string | null) => setState((prev) => ({ ...prev, error }));

    const fetchProducts = useCallback(async (params?: ProductQueryParams) => {
        setLoading(true);
        try {
            const { results, count } = await productService.getProducts(params);
            console.log(results);
            setState({
                products: results || [],
                totalCount: count || 0,
                isLoading: false,
                error: null,
            });
        } catch (err) {
            handleError(err, 'Error al cargar los productos.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProductById = useCallback(async (id: number): Promise<Product | null> => {
        setLoading(true);
        try {
            const product = await productService.getProductById(id);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: null,
            }));
            return product;
        } catch (err) {
            handleError(err, 'Error al cargar el producto.');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const addProduct = async (payload: CreateProductPayload): Promise<Product | null> => {
        setLoading(true);
        try {
            const created = await productService.createProduct(payload);
            setState((prev) => ({
                ...prev,
                products: [created, ...prev.products],
                totalCount: prev.totalCount + 1,
                isLoading: false,
            }));
            showToast('Producto creado exitosamente.', 'success');
            return created;
        } catch (err) {
            handleError(err, 'Error al crear el producto.');
            return null;
        }
    };

    const updateProduct = async (
        id: number,
        payload: PatchProductPayload,
    ): Promise<Product | null> => {
        setLoading(true);
        try {
            const updated = await productService.patchProduct(id, payload);
            setState((prev) => ({
                ...prev,
                products: prev.products.map((p) => (p.id === id ? updated : p)),
                isLoading: false,
            }));
            showToast('Producto actualizado correctamente.', 'success');
            return updated;
        } catch (err) {
            handleError(err, 'Error al actualizar el producto.');
            return null;
        }
    };

    const deleteProduct = async (id: number, managerCode?: string): Promise<boolean> => {
        setLoading(true);
        try {
            await productService.deleteProduct(id, managerCode);
            setState((prev) => ({
                ...prev,
                products: prev.products.filter((p) => p.id !== id),
                totalCount: prev.totalCount - 1,
                isLoading: false,
            }));
            showToast('Producto eliminado correctamente.', 'success');
            return true;
        } catch (err) {
            handleError(err, 'Error al eliminar el producto.');
            return false;
        }
    };

    const handleError = (error: unknown, defaultMessage: string) => {
        const message = getErrorMessage(error, defaultMessage);
        setLoading(false);
        showToast(message, 'error');
        setError(message);
    };

    const { products, totalCount, isLoading, error } = state;

    return {
        products,
        totalCount,
        isLoading,
        error,
        fetchProducts,
        fetchProductById,
        addProduct,
        updateProduct,
        deleteProduct,
    };
};
