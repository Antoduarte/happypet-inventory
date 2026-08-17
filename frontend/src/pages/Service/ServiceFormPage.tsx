import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, Trash2, Wrench, Tag, FolderPlus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { TogglePills } from '@/components/ui/TogglePills';
import { useService } from '../../hooks/useService';
import { useManagerGate } from '../../hooks/useManagerGate';
import { useCategory } from '../../hooks/useCategory';
import Loading from '../../components/ui/Loading';
import { QuickActionsSidebar } from '@/components/ui/QuickActionsSidebar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { QuickCategoryModal } from '@/components/ui/QuickCategoryModal';
import { Select } from '@/components/ui/Select';
import type { Category } from '@/interfaces/category';
import { serviceSchema, type ServiceFormData } from '../../schemas/service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Service API response to the form default values */
const serviceToFormValues = (service: {
    name: string;
    description: string | null;
    price: string;
    is_active: boolean;
    category: { id: number } | null;
}): ServiceFormData => ({
    name: service.name,
    description: service.description ?? '',
    price: parseFloat(service.price),
    is_active: service.is_active,
    category_id: service.category?.id ?? null,
});

// ─── Static option sets ────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    {
        value: true,
        label: 'Activo',
        activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-300',
    },
    {
        value: false,
        label: 'Inactivo',
        activeClass: 'border-slate-400 bg-slate-400 text-white shadow-sm shadow-slate-200',
    },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ServiceFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const serviceId = id ? parseInt(id, 10) : null;

    const navigate = useNavigate();
    const { addService, updateService, deleteService, fetchServiceById } = useService();
    const { requireAuthorization, managerGateModal } = useManagerGate();
    const {
        categories,
        fetchCategories,
        addCategory,
        isLoading: isLoadingCategories,
    } = useCategory();

    const [isFetchingService, setIsFetchingService] = useState(isEditing);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showQuickCategory, setShowQuickCategory] = useState(false);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ServiceFormData>({
        resolver: zodResolver(serviceSchema) as never,
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            is_active: true,
            category_id: null,
        },
    });

    useEffect(() => {
        fetchCategories({ type: 'service', page_size: 100 });
    }, [fetchCategories]);

    useEffect(() => {
        if (!isEditing || !serviceId) return;

        fetchServiceById(serviceId)
            .then((service) => {
                if (!service) {
                    navigate('/services');
                    return;
                }
                reset(serviceToFormValues(service));
            })
            .catch(() => navigate('/services'))
            .finally(() => setIsFetchingService(false));
    }, [isEditing, serviceId, fetchServiceById, navigate, reset]);

    const goToServices = () => navigate('/services');

    const handleFormSubmit = async ({
        name,
        description,
        price,
        is_active,
        category_id,
    }: ServiceFormData) => {
        const payload = {
            name,
            description: description || null,
            price,
            is_active,
            category_id: category_id ?? null,
        };

        if (isEditing && serviceId) {
            // Editar requiere código de gerente para cajeros (una vez por sesión).
            requireAuthorization(async (code) => {
                const result = await updateService(
                    serviceId,
                    code ? { ...payload, manager_code: code } : payload,
                );
                if (result) goToServices();
            });
            return;
        }

        const result = await addService(payload);
        if (result) goToServices();
    };

    const handleConfirmDelete = () => {
        if (!serviceId) return;
        setShowConfirmDelete(false);
        // Eliminar requiere código de gerente para cajeros (una vez por sesión).
        requireAuthorization(async (code) => {
            setIsDeleting(true);
            const success = await deleteService(serviceId, code);
            setIsDeleting(false);
            if (success) goToServices();
        });
    };

    /** Crea una categoría de servicio rápidamente desde el formulario. */
    const handleQuickCategoryCreated = async (partialCategory: Category) => {
        setIsCreatingCategory(true);
        try {
            const created = await addCategory({
                name: partialCategory.name,
                description: partialCategory.description ?? undefined,
                type: 'service',
                is_active: true,
            });
            if (created) {
                await fetchCategories({ type: 'service', page_size: 100 });
                setValue('category_id', created.id, { shouldDirty: true });
            }
        } finally {
            setIsCreatingCategory(false);
            setShowQuickCategory(false);
        }
    };

    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: isEditing ? 'Guardar cambios' : 'Crear servicio',
                description: isEditing
                    ? 'Guardar cambios en el servicio'
                    : 'Crear un nuevo servicio',
                icon: Save,
                variant: 'primary' as const,
                isLoading: isSubmitting,
                disabled: isSubmitting,
                onClick: () => handleSubmit(handleFormSubmit as never)(),
            },
            {
                id: 'cancel',
                label: 'Cancelar',
                description: 'Volver al listado',
                icon: X,
                variant: 'default' as const,
                disabled: isSubmitting,
                onClick: goToServices,
            },
            {
                id: 'delete',
                label: 'Eliminar servicio',
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

    const categoryOptions = useMemo(
        () => categories.map(({ id, name }) => ({ value: id, label: name })),
        [categories],
    );

    if (isFetchingService) return <Loading />;

    return (
        <>
            <div>
                <PageHeader
                    title={isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Servicios', path: '/services' },
                        { label: isEditing ? 'Editar' : 'Nuevo' },
                    ]}
                />

                <div className="flex gap-6 items-start">
                    {/* ── Main Form ── */}
                    <div className="flex-1 min-w-0">
                        <Card>
                            <form
                                onSubmit={handleSubmit(handleFormSubmit as never)}
                                className="space-y-8"
                            >
                                {/* ─ Información del servicio ─ */}
                                <FormSection
                                    title="Información del servicio"
                                    description="Nombre, descripción y precio del servicio"
                                    icon={Wrench}
                                    iconBg="bg-brand/10"
                                    iconColor="text-brand"
                                >
                                    {/* Nombre */}
                                    <Input
                                        label="Nombre del Servicio"
                                        placeholder="ej. Baño básico"
                                        {...register('name')}
                                        error={errors.name?.message}
                                        required
                                    />

                                    {/* Descripción */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            Descripción{' '}
                                            <span className="text-slate-400 font-normal">
                                                (opcional)
                                            </span>
                                        </label>
                                        <textarea
                                            {...register('description')}
                                            rows={3}
                                            placeholder="Detalles sobre este servicio…"
                                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none resize-none hover:border-slate-400"
                                        />
                                        {errors.description?.message && (
                                            <p className="text-xs text-red-500">
                                                {errors.description.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Precio */}
                                    <Input
                                        label="Precio (C$)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        {...register('price')}
                                        error={errors.price?.message}
                                        required
                                    />
                                </FormSection>

                                {/* ─ Categoría y estado ─ */}
                                <FormSection
                                    title="Categoría y estado"
                                    description="Organización y disponibilidad del servicio"
                                    icon={Tag}
                                    iconBg="bg-violet-100"
                                    iconColor="text-violet-600"
                                >
                                    {/* Categoría */}
                                    <div className="flex items-end gap-2">
                                        <Select
                                            name="category_id"
                                            control={control}
                                            options={categoryOptions}
                                            label="Categoría"
                                            error={errors.category_id?.message}
                                            isLoading={isLoadingCategories}
                                            noOptionsText="Sin categoría"
                                            className="flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowQuickCategory(true)}
                                            className="inline-flex items-center min-w-fit gap-2 text-sm text-brand px-4 py-2 rounded-lg hover:bg-brand/10 font-medium transition-colors"
                                            aria-label="Crear nueva categoría"
                                        >
                                            <span className="shrink-0 p-1.5 rounded-md bg-brand/10 text-brand">
                                                <FolderPlus size={20} />
                                            </span>
                                            Nueva categoría
                                        </button>
                                    </div>

                                    {/* Estado */}
                                    <Controller
                                        name="is_active"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                label="Estado"
                                                required
                                                options={STATUS_OPTIONS as any}
                                                value={field.value as any}
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

            <ConfirmDialog
                isOpen={showConfirmDelete}
                title="¿Eliminar servicio?"
                message="Esta acción desactivará permanentemente el servicio. No podrás deshacer este cambio."
                confirmLabel="Sí, eliminar"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmDelete(false)}
            />

            {/* ── Quick Category Modal ── */}
            <QuickCategoryModal
                isOpen={showQuickCategory}
                isLoading={isCreatingCategory}
                onCreated={handleQuickCategoryCreated}
                onClose={() => setShowQuickCategory(false)}
            />

            {/* ── Autorización de gerente (cajeros) ── */}
            {managerGateModal}
        </>
    );
};
