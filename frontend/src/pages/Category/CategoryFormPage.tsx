import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, Trash2, Tag, Layers } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { TogglePills } from '@/components/ui/TogglePills';
import { useCategory } from '@/hooks/useCategory';
import { categorySchema, type CategoryFormData } from '@/schemas/category';
import { categoryToFormValues } from '@/utils/form';
import Loading from '@/components/ui/Loading';
import { QuickActionsSidebar } from '@/components/ui/QuickActionsSidebar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// ─── Static option sets ────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
    { value: 'product', label: 'Producto' },
    { value: 'service', label: 'Servicio' },
] as const;

const STATUS_OPTIONS = [
    {
        value: 'active',
        label: 'Activo',
        activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-300',
    },
    {
        value: 'inactive',
        label: 'Inactivo',
        activeClass: 'border-slate-400 bg-slate-400 text-white shadow-sm shadow-slate-200',
    },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export const CategoryFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const categoryId = id ? parseInt(id, 10) : undefined;

    const navigate = useNavigate();
    const { fetchCategoryById, addCategory, updateCategory, deleteCategory } = useCategory();

    const [isFetchingCategory, setIsFetchingCategory] = useState(isEditing);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            description: '',
            status: 'active',
            type: 'product',
        },
    });

    useEffect(() => {
        if (!isEditing || !categoryId) return;

        fetchCategoryById(categoryId)
            .then((category) => {
                if (!category) {
                    navigate('/categories');
                    return;
                }
                reset(categoryToFormValues(category));
            })
            .catch(() => navigate('/categories'))
            .finally(() => setIsFetchingCategory(false));
    }, [isEditing, categoryId, reset, navigate, fetchCategoryById]);

    const goToCategories = () => navigate('/categories');

    const handleFormSubmit = (data: CategoryFormData) => {
        const payload = { ...data, is_active: data.status === 'active' };

        if (isEditing && categoryId) {
            updateCategory(categoryId, payload);
            goToCategories();
            return;
        }

        addCategory(payload);
        goToCategories();
    };

    const handleConfirmDelete = async () => {
        if (!categoryId) return;
        setIsDeleting(true);
        await deleteCategory(categoryId);
        setIsDeleting(false);
        setShowConfirmDelete(false);
        goToCategories();
    };

    // Quick actions data
    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: isEditing ? 'Guardar cambios' : 'Crear categoría',
                description: isEditing
                    ? 'Guardar cambios en la categoría'
                    : 'Crear una nueva categoría',
                icon: Save,
                variant: 'primary' as const,
                isLoading: isSubmitting,
                disabled: isSubmitting,
                onClick: () => handleSubmit(handleFormSubmit)(),
            },
            {
                id: 'cancel',
                label: 'Cancelar',
                description: 'Volver al listado',
                icon: X,
                variant: 'default' as const,
                disabled: isSubmitting,
                onClick: goToCategories,
            },
            {
                id: 'delete',
                label: 'Eliminar categoría',
                description: 'Esta acción es irreversible',
                icon: Trash2,
                variant: 'danger' as const,
                dividerBefore: true,
                hidden: !isEditing,
                isLoading: isDeleting,
                onClick: () => setShowConfirmDelete(true),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isEditing, isSubmitting, isDeleting],
    );

    if (isFetchingCategory) return <Loading />;

    return (
        <>
            <div>
                <PageHeader
                    title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Categorías', path: '/categories' },
                        { label: isEditing ? 'Editar' : 'Nueva' },
                    ]}
                />

                <div className="flex gap-6 items-start">
                    {/* ── Main Form ── */}
                    <div className="flex-1 min-w-0">
                        <Card>
                            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
                                {/* ─ Información básica ─ */}
                                <FormSection
                                    title="Información básica"
                                    description="Nombre e identificación de la categoría"
                                    icon={Tag}
                                    iconBg="bg-brand/10"
                                    iconColor="text-brand"
                                >
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
                                </FormSection>

                                {/* ─ Clasificación ─ */}
                                <FormSection
                                    title="Clasificación y estado"
                                    description="Tipo de entidad que agrupa y visibilidad"
                                    icon={Layers}
                                    iconBg="bg-violet-100"
                                    iconColor="text-violet-600"
                                >
                                    {/* Tipo */}
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                label="Tipo de categoría"
                                                required
                                                options={TYPE_OPTIONS as any}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.type?.message}
                                            />
                                        )}
                                    />

                                    {/* Estado */}
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                label="Estado"
                                                required
                                                options={STATUS_OPTIONS as any}
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </FormSection>
                            </form>
                        </Card>
                    </div>

                    {/* ── Quick Actions Sidebar ── */}
                    <QuickActionsSidebar actions={sidebarActions} />
                </div>
            </div>

            {/* ── Confirm Delete Dialog ── */}
            <ConfirmDialog
                isOpen={showConfirmDelete}
                title="¿Eliminar categoría?"
                message="Esta acción eliminará permanentemente la categoría. Los productos asociados perderán su categoría."
                confirmLabel="Sí, eliminar"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmDelete(false)}
            />
        </>
    );
};
