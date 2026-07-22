import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Product } from '../../interfaces/product';
import { categoryService } from '@/services/category';

// ---------------------------------------------------------------------------
// Esquema — alineado con el modelo real del backend
// ---------------------------------------------------------------------------

const productSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().min(1, 'La descripción es requerida'),
    code: z.string().optional().nullable(),
    categoryId: z.coerce.number().nullable().optional(),
    price: z.coerce.number().min(0, 'El precio debe ser positivo'),
    stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo'),
});

type ProductFormData = z.infer<typeof productSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProductFormData) => void | Promise<void>;
    initialData?: Product | null;
    isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isLoading = false,
}) => {
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema) as never,
        defaultValues: {
            name: '',
            description: '',
            code: '',
            categoryId: null,
            price: 0,
            stock: 0,
        },
    });

    // Cargar categorías al abrir por primera vez
    useEffect(() => {
        categoryService
            .getCategories()
            .then((res) => setCategories(res.results))
            .catch(() => {});
    }, []);

    // Sincronizar valores del formulario cuando se abre/cambia el producto inicial
    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {
            reset({
                name: initialData.name,
                description: initialData.description,
                code: initialData.code ?? '',
                categoryId: initialData.category?.id ?? null,
                price: parseFloat(initialData.price),
                stock: parseFloat(initialData.stock),
            });
        } else {
            reset({
                name: '',
                description: '',
                code: '',
                categoryId: null,
                price: 0,
                stock: 0,
            });
        }
    }, [isOpen, initialData, reset]);

    const handleFormSubmit = async (data: ProductFormData) => {
        await onSubmit(data);
        onClose();
    };

    const isBusy = isSubmitting || isLoading;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Editar Producto' : 'Nuevo Producto'}
            width="md"
        >
            <form onSubmit={handleSubmit(handleFormSubmit as never)} className="space-y-4">
                {/* Nombre y Código */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Nombre *"
                        placeholder="Nombre del producto"
                        {...register('name')}
                        error={errors.name?.message}
                    />
                    <Input
                        label="Código / SKU"
                        placeholder="Código único (opcional)"
                        {...register('code')}
                        error={errors.code?.message}
                    />
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Descripción *</label>
                    <textarea
                        {...register('description')}
                        rows={2}
                        placeholder="Descripción del producto"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none resize-none"
                    />
                    {errors.description?.message && (
                        <p className="text-xs text-red-500">{errors.description.message}</p>
                    )}
                </div>

                {/* Categoría */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Categoría</label>
                    <Controller
                        name="categoryId"
                        control={control}
                        render={({ field }) => (
                            <select
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                    field.onChange(e.target.value ? Number(e.target.value) : null)
                                }
                                className="form-select w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none"
                            >
                                <option value="">Sin categoría</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    />
                    {errors.categoryId?.message && (
                        <p className="text-xs text-red-500">{errors.categoryId.message}</p>
                    )}
                </div>

                {/* Precio y Stock */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Precio de Venta (C$) *"
                        type="number"
                        step="0.01"
                        {...register('price')}
                        error={errors.price?.message}
                    />
                    <Input
                        label="Stock"
                        type="number"
                        {...register('stock')}
                        error={errors.stock?.message}
                    />
                </div>

                {/* Acciones */}
                <div className="pt-4 flex gap-3 justify-end">
                    <Button variant="ghost" type="button" onClick={onClose} disabled={isBusy}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={isBusy}>
                        {initialData ? 'Guardar Cambios' : 'Crear Producto'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
