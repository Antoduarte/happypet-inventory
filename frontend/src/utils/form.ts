import type { Category } from '@/interfaces/category';
import type { Product } from '../interfaces/product';
import type { ProductFormData } from '../schemas/product';
import { flagsToUsage, normalizeBaseUnit } from '../schemas/product';
import type { CategoryFormData } from '@/schemas/category';

/** Convert Product to ProductFormData
 * @param product Product to convert
 * @returns ProductFormData
 */
export const productToFormValues = ({
    name,
    description,
    code,
    category,
    price,
    stock,
    base_unit,
    is_sale_product,
    is_service_supply,
}: Product): ProductFormData => ({
    name,
    description,
    code: code ?? '',
    categoryId: category?.id ?? null,
    price: parseFloat(price),
    stock: parseFloat(stock as any),
    base_unit: normalizeBaseUnit(base_unit),
    usage: flagsToUsage(is_sale_product, is_service_supply),
});

/** Convert Category to CategoryFormData
 * @param category Category to convert
 * @returns CategoryFormData
 */
export const categoryToFormValues = ({
    name,
    description,
    is_active,
    type,
}: Category): CategoryFormData => ({
    name,
    description: description ?? '',
    status: is_active ? 'active' : 'inactive',
    type,
});
