/**
 * Interfaces de Productos
 *
 * Tipado completo derivado de los modelos y serializers del backend:
 * - Category → CategorySerializer
 * - Product → ProductSerializer
 * - InventoryMovement → InventoryMovementSerializer
 *
 * Se usan en ProductService para tipar requests y responses de forma
 * consistente y sin uso de `any`.
 */

import type { Category } from './category';

// ---------------------------------------------------------------------------
// ProductPresentation
// ---------------------------------------------------------------------------

/** Una forma de vender el producto base (saco, libra, caja, unidad, ml…) */
export interface ProductPresentation {
    id: number;
    /** Nombre descriptivo, ej: "Saco 100lb", "Libra suelta", "Botella 500ml" */
    name: string;
    /**
     * Cuántas unidades base contiene esta presentación.
     * Serialized as string by DRF DecimalField.
     * Ej: "100" para un saco de 100 lb, "0.5" para media libra.
     */
    multiplier: string;
    /** Precio de venta de esta presentación. Serialized as string. */
    price: string;
    barcode: string | null;
    is_active: boolean;
}

/** Payload para crear/actualizar una presentación */
export interface CreatePresentationPayload {
    /** FK del producto padre (write-only en el serializer) */
    product_id: number;
    name: string;
    /** Decimal string or number: ej. "100", 0.5 */
    multiplier: string | number;
    price: string | number;
    barcode?: string | null;
    is_active?: boolean;
}

export type UpdatePresentationPayload = CreatePresentationPayload;
export type PatchPresentationPayload = Partial<CreatePresentationPayload>;

export interface PresentationQueryParams {
    product?: number;
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
    include_inactive?: boolean;
}

export interface Product {
    id: number;
    name: string;
    description: string;
    /** Precio como string porque la API serializa DecimalField como string */
    price: string;
    stock: string;
    code: string | null;
    /** Unidad base del stock (lb, kg, ml, u, etc.) */
    base_unit: string;
    /** La categoría llega anidada (read_only) en GET; se envía el id en escritura */
    category: Category | null;
    /** Presentaciones anidadas (solo lectura, GET) */
    presentations: ProductPresentation[];
    /** Aparece como producto de venta directa */
    is_sale_product: boolean;
    /** Aparece como insumo de un servicio en la venta */
    is_service_supply: boolean;
}

/** Payload para crear un producto (POST /products/) */
export interface CreateProductPayload {
    name: string;
    description: string;
    price: string | number;
    stock: number;
    code?: string | null;
    /** Foreign key: id de la categoría */
    category?: number | null;
    /** Rol del producto: aparece en venta directa */
    is_sale_product?: boolean;
    /** Rol del producto: aparece como insumo de servicio */
    is_service_supply?: boolean;
    /** Código de autorización de manager/admin. El backend lo exige solo para cajeros. */
    manager_code?: string;
}

/** Payload para actualización completa (PUT /products/{id}/) */
export type UpdateProductPayload = CreateProductPayload;

/** Payload para actualización parcial (PATCH /products/{id}/) */
export type PatchProductPayload = Partial<CreateProductPayload>;

// ---------------------------------------------------------------------------
// Inventory Movement
// ---------------------------------------------------------------------------

export type MovementType = 'in' | 'out';

export interface MovementItem {
    product_id: number;
    presentation_id: number | null;
    quantity: number;
}

export interface InventoryMovement {
    id: number;
    product: Product;
    presentation: ProductPresentation | null;
    movement_type: MovementType;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    movement_date: string;
    notes: string | null;
}

/** A batch groups one or more InventoryMovement records from a single operation. */
export interface MovementBatch {
    id: number;
    movement_type: MovementType;
    notes: string | null;
    created_at: string;
    items: InventoryMovement[];
}

/** Payload to create a movement batch via POST /movement-batches/. */
export interface CreateMovementPayload {
    movement_type: MovementType;
    notes?: string | null;
    write_items: MovementItem[];
    /** Código de autorización de manager/admin. El backend lo exige solo para cajeros. */
    manager_code?: string;
}

// ---------------------------------------------------------------------------
// Paginación (DRF DefaultRouter devuelve listas paginadas opcionalmente)
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// ---------------------------------------------------------------------------
// Parámetros de consulta
// ---------------------------------------------------------------------------

export interface ProductQueryParams {
    /** Búsqueda por nombre o categoría */
    search?: string;
    /** Campo por el que ordenar (ej: "price", "-stock") */
    ordering?: string;
    /** Número de página para la paginación */
    page?: number;
    /** Tamaño de la página (opcional) */
    page_size?: number;
    /** Filtrar por ID de categoría */
    category?: number | null;
    /** Filtrar por rol: productos de venta directa */
    is_sale_product?: boolean;
    /** Filtrar por rol: insumos de servicio */
    is_service_supply?: boolean;
}

export interface MovementQueryParams {
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    /** Filter by product ID */
    product?: number | null;
    /** Filter by movement type */
    movement_type?: MovementType;
}

export interface MovementBatchQueryParams {
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
    movement_type?: MovementType;
}
