import { z } from 'zod';

export const productSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().min(1, 'La descripción es requerida'),
    code: z.string().optional().nullable(),
    categoryId: z.coerce
        .number({ message: 'La categoría es requerida' })
        .positive()
        .optional()
        .nullable(),
    price: z.coerce.number().min(0, 'El precio debe ser positivo'),
    // Decimal stock: now a float (DecimalField on the backend)
    stock: z.coerce.number().min(0, 'El stock no puede ser negativo'),
    /** Unidad de medida base: lb, kg, ml, u, caja, etc. */
    base_unit: z
        .string()
        .min(1, 'La unidad base es requerida')
        .max(20, 'Máximo 20 caracteres')
        .default('u'),
    /** Uso del producto: venta directa, insumo de servicio, o ambos. */
    usage: z.enum(['sale', 'supply', 'both']).default('sale'),
});

export type ProductFormData = z.infer<typeof productSchema>;

export type ProductUsage = ProductFormData['usage'];

export const PRODUCT_USAGE_OPTIONS: { value: ProductUsage; label: string }[] = [
    { value: 'sale', label: 'Solo venta' },
    { value: 'supply', label: 'Solo insumo' },
    { value: 'both', label: 'Ambos' },
];

/** Deriva el `usage` del formulario a partir de los dos booleanos del modelo. */
export const flagsToUsage = (
    isSaleProduct: boolean,
    isServiceSupply: boolean,
): ProductUsage => {
    if (isSaleProduct && isServiceSupply) return 'both';
    if (isServiceSupply) return 'supply';
    return 'sale';
};

/** Mapea el `usage` del formulario a los dos booleanos del modelo. */
export const usageToFlags = (
    usage: ProductUsage,
): { is_sale_product: boolean; is_service_supply: boolean } => ({
    is_sale_product: usage === 'sale' || usage === 'both',
    is_service_supply: usage === 'supply' || usage === 'both',
});

export const BASE_UNIT_LABELS: Record<string, string> = {
    u: 'Unidad',
    kg: 'Kilogramo',
    g: 'Gramo',
    lb: 'Libra',
    ml: 'Mililitro',
    l: 'Litro',
    caja: 'Caja',
};

export const BASE_UNIT_CHOICES = [
    { value: 'u', label: 'Unidad (u)' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'g', label: 'Gramo (g)' },
    { value: 'lb', label: 'Libra (lb)' },
    { value: 'ml', label: 'Mililitro (ml)' },
    { value: 'l', label: 'Litro (l)' },
    { value: 'caja', label: 'Caja (caja)' },
];

/** Mapea variantes/valores legacy de base_unit al código válido. */
const BASE_UNIT_ALIASES: Record<string, string> = {
    u: 'u', unidad: 'u', unidades: 'u',
    lb: 'lb', libra: 'lb', libras: 'lb',
    kg: 'kg', kilogramo: 'kg', kilogramos: 'kg', kilo: 'kg',
    g: 'g', gramo: 'g', gramos: 'g',
    ml: 'ml', mililitro: 'ml', mililitros: 'ml',
    l: 'l', litro: 'l', litros: 'l',
    caja: 'caja', cajas: 'caja',
};

/**
 * Normaliza un base_unit a un código válido de BASE_UNIT_CHOICES.
 * Evita reenviar valores inválidos (legacy) que el backend rechazaría.
 */
export const normalizeBaseUnit = (value: string | null | undefined): string =>
    BASE_UNIT_ALIASES[(value ?? '').trim().toLowerCase()] ?? 'u';
