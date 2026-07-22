import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Category } from '../../interfaces/category';

const categorySchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CategoryFormData) => void;
    initialData?: Category | null;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
}) => {
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            description: '',
            status: 'active',
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    name: initialData.name,
                    description: initialData.description ?? '',
                    status: initialData.is_active ? 'active' : 'inactive',
                });
            } else {
                reset({ name: '', description: '', status: 'active' });
            }
        }
    }, [isOpen, initialData, reset]);

    const handleFormSubmit = (data: CategoryFormData) => {
        onSubmit(data);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Editar Categoría' : 'Nueva Categoría'}
            width="sm"
        >
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <Input
                    label="Nombre de la Categoría"
                    placeholder="ej. Comida para Perros"
                    {...register('name')}
                    error={errors.name?.message}
                    required
                />

                <Input
                    label="Descripción"
                    placeholder="Descripción opcional de la categoría"
                    {...register('description')}
                    error={errors.description?.message}
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Estado *</label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <select
                                {...field}
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-4 focus:ring-brand-light/10 outline-none transition-all"
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        )}
                    />
                    {errors.status?.message && (
                        <p className="text-xs mt-0.5 text-red-500">{errors.status.message}</p>
                    )}
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit">
                        {initialData ? 'Guardar Cambios' : 'Crear Categoría'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
