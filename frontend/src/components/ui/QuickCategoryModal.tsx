import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/interfaces/category';

// ---------------------------------------------------------------------------
// Schema — minimal category creation
// ---------------------------------------------------------------------------

const quickCategorySchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().optional(),
});

type QuickCategoryFormData = z.infer<typeof quickCategorySchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuickCategoryModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Whether the form submission is in progress */
    isLoading?: boolean;
    /** Called when the user submits and the category is created successfully */
    onCreated: (category: Category) => void;
    /** Called when the modal is closed without creating */
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * QuickCategoryModal
 *
 * A lightweight modal for creating a new product category directly from
 * a product form, without leaving the current page. Automatically selects
 * the newly created category in the parent form after creation.
 */
export const QuickCategoryModal: React.FC<QuickCategoryModalProps> = ({
    isOpen,
    isLoading = false,
    onCreated,
    onClose,
}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<QuickCategoryFormData>({
        resolver: zodResolver(quickCategorySchema),
        defaultValues: { name: '', description: '' },
    });

    // Reset form whenever modal opens so it starts fresh
    useEffect(() => {
        if (isOpen) reset({ name: '', description: '' });
    }, [isOpen, reset]);

    const handleFormSubmit = async (data: QuickCategoryFormData) => {
        // The parent component is responsible for the actual API call via onCreated
        // We expose the form data wrapped in the expected Category shape (minus id)
        onCreated({
            id: -1, // placeholder; parent must replace with real response
            name: data.name,
            description: data.description ?? null,
            type: 'product',
            is_active: true,
        });
    };

    const isBusy = isSubmitting || isLoading;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Categoría" width="sm">
            <div className="flex items-start gap-3 mb-5">
                <div className="shrink-0 p-2 bg-brand/10 rounded-lg">
                    <FolderPlus size={20} className="text-brand" />
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Crea una categoría rápidamente. Será seleccionada automáticamente en el
                    formulario.
                </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <Input
                    label="Nombre de la categoría *"
                    placeholder="Ej: Alimentos, Accesorios…"
                    autoFocus
                    {...register('name')}
                    error={errors.name?.message}
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                        Descripción <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                        {...register('description')}
                        rows={2}
                        placeholder="Breve descripción de la categoría"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none resize-none"
                    />
                    {errors.description?.message && (
                        <p className="text-xs text-red-500">{errors.description.message}</p>
                    )}
                </div>

                <div className="pt-2 flex gap-3 justify-end">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={isBusy} className="gap-2">
                        <FolderPlus size={15} />
                        Crear Categoría
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickCategoryModal;
