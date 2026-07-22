import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Trash2,
    Save,
    X,
    FolderPlus,
    Package,
    FileText,
    Tag,
    DollarSign,
    Layers,
    ShoppingBag,
} from 'lucide-react';
import { TogglePills } from '@/components/ui/TogglePills';
import { QuickActionsSidebar } from '@/components/ui/QuickActionsSidebar';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { useProduct } from '../../hooks/useProduct';
import { useManagerGate } from '../../hooks/useManagerGate';
import {
    productSchema,
    type ProductFormData,
    BASE_UNIT_CHOICES,
    PRODUCT_USAGE_OPTIONS,
    usageToFlags,
} from '../../schemas/product';
import { useCategory } from '../../hooks/useCategory';
import { usePresentation } from '../../hooks/usePresentation';
import Loading from '../../components/ui/Loading';
import { productToFormValues } from '@/utils/form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { QuickCategoryModal } from '@/components/ui/QuickCategoryModal';
import type { Category } from '@/interfaces/category';
import Select from '@/components/ui/Select';
import { PresentationsPanel } from './PresentationsPanel';

export const ProductFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const productId = id ? parseInt(id, 10) : null;

    const [isFetchingProduct, setIsFetchingProduct] = useState(isEditing);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showQuickCategory, setShowQuickCategory] = useState(false);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    const navigate = useNavigate();
    const { addProduct, updateProduct, deleteProduct, fetchProductById } = useProduct();
    const { requireAuthorization, managerGateModal } = useManagerGate();
    const {
        categories,
        fetchCategories,
        addCategory,
        isLoading: isLoadingCategories,
    } = useCategory();
    const { presentations, fetchPresentations } = usePresentation();

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema) as never,
        defaultValues: {
            name: '',
            description: '',
            code: '',
            categoryId: undefined,
            price: 0,
            stock: 0,
            base_unit: 'u',
            usage: 'sale',
        },
    });

    useEffect(() => {
        fetchCategories({ type: 'product', page_size: 50 });
    }, [fetchCategories]);

    useEffect(() => {
        if (!isEditing || !productId) return;

        fetchProductById(productId)
            .then((product) => {
                if (!product) {
                    navigate('/products');
                    return;
                }
                reset(productToFormValues(product));
                // Also populate the base_unit from the fetched product
                if ((product as any).base_unit) {
                    setValue('base_unit' as any, (product as any).base_unit);
                }
            })
            .catch(() => navigate('/products'))
            .finally(() => setIsFetchingProduct(false));

        // Load presentations for this product
        fetchPresentations({ product: productId, include_inactive: true });
    }, [isEditing, productId, reset, navigate, fetchProductById, fetchPresentations]);

    const goToProducts = () => navigate('/products');

    const handleFormSubmit = async ({
        name,
        description,
        code,
        categoryId,
        price,
        stock,
        base_unit,
        usage,
    }: ProductFormData) => {
        const payload = {
            name,
            description,
            code: code || null,
            category_id: categoryId ?? null,
            price,
            stock,
            base_unit: base_unit || 'u',
            ...usageToFlags(usage),
        };

        if (isEditing && productId) {
            // Editar requiere código de gerente para cajeros (una vez por sesión).
            requireAuthorization(async (code) => {
                const result = await updateProduct(
                    productId,
                    code ? { ...payload, manager_code: code } : payload,
                );
                if (result) goToProducts();
            });
            return;
        }

        const result = await addProduct(payload);
        if (result) goToProducts();
    };

    const handleConfirmDelete = () => {
        if (!productId) return;
        setShowConfirmDelete(false);
        // Eliminar requiere código de gerente para cajeros (una vez por sesión).
        requireAuthorization(async (code) => {
            setIsDeleting(true);
            const success = await deleteProduct(productId, code);
            setIsDeleting(false);
            if (success) goToProducts();
        });
    };

    /** Quick-create category inline */
    const handleQuickCategoryCreated = async (partialCategory: Category) => {
        setIsCreatingCategory(true);
        try {
            const created = await addCategory({
                name: partialCategory.name,
                description: partialCategory.description ?? undefined,
                type: 'product',
                is_active: true,
            });
            if (created) {
                // Refresh category list and auto-select the new one
                await fetchCategories({ type: 'product', page_size: 50 });
                setValue('categoryId', created.id, { shouldDirty: true });
            }
        } finally {
            setIsCreatingCategory(false);
            setShowQuickCategory(false);
        }
    };

    // Quick actions data
    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: isEditing ? 'Guardar cambios' : 'Crear producto',
                description: isEditing
                    ? 'Guardar cambios en el producto'
                    : 'Crear un nuevo producto',
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
                onClick: goToProducts,
            },
            {
                id: 'delete',
                label: 'Eliminar producto',
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
        () =>
            categories.map(({ id, name }) => ({
                value: id,
                label: name,
            })),
        [categories],
    );

    const breadcrumbs = useMemo(
        () => [
            { label: 'Panel', path: '/' },
            { label: 'Productos', path: '/products' },
            { label: isEditing ? 'Editar' : 'Nuevo' },
        ],
        [isEditing],
    );

    if (isFetchingProduct) return <Loading />;

    return (
        <>
            <div>
                <PageHeader
                    title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="flex gap-6 items-start">
                    {/* ── Main Form ── */}
                    <div className="flex-1 min-w-0">
                        <Card>
                            <form
                                onSubmit={handleSubmit(handleFormSubmit as never)}
                                className="space-y-8"
                            >
                                {/* ─ Identificación ─ */}
                                <FormSection
                                    title="Identificación del producto"
                                    description="Nombre y código único del producto"
                                    icon={Package}
                                    iconBg="bg-brand/10"
                                    iconColor="text-brand"
                                >
                                    {/* Nombre y Código */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input
                                            label="Nombre"
                                            placeholder="Nombre del producto"
                                            {...register('name')}
                                            error={errors.name?.message}
                                            required
                                        />
                                        <Input
                                            label="Código"
                                            placeholder="Código único"
                                            {...register('code')}
                                            error={errors.code?.message}
                                        />
                                    </div>

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
                                            placeholder="Descripción del producto"
                                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none resize-none hover:border-slate-400"
                                        />
                                        {errors.description?.message && (
                                            <p className="text-xs text-red-500">
                                                {errors.description.message}
                                            </p>
                                        )}
                                    </div>
                                </FormSection>

                                {/* ─ Categoría ─ */}
                                <FormSection
                                    title="Categoría"
                                    description="Agrupa el producto dentro de una categoría"
                                    icon={Tag}
                                    iconBg="bg-violet-100"
                                    iconColor="text-violet-600"
                                >
                                    <div className="flex items-end gap-2">
                                        <Select
                                            name="categoryId"
                                            control={control}
                                            options={categoryOptions}
                                            label="Categoría"
                                            error={errors.categoryId?.message}
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
                                </FormSection>

                                {/* ─ Uso del producto ─ */}
                                <FormSection
                                    title="Uso del producto"
                                    description="Define si el producto se vende directamente, se usa como insumo de un servicio, o ambos"
                                    icon={ShoppingBag}
                                    iconBg="bg-amber-100"
                                    iconColor="text-amber-600"
                                >
                                    <Controller
                                        name="usage"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                options={PRODUCT_USAGE_OPTIONS}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={(errors as any).usage?.message}
                                            />
                                        )}
                                    />
                                </FormSection>

                                {/* ─ Precio y Stock ─ */}
                                <FormSection
                                    title="Precio y stock"
                                    description="Valor de venta e inventario inicial"
                                    icon={DollarSign}
                                    iconBg="bg-emerald-100"
                                    iconColor="text-emerald-600"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Select
                                            name="base_unit"
                                            control={control}
                                            options={BASE_UNIT_CHOICES}
                                            label="Unidad base"
                                            error={(errors as any).base_unit?.message}
                                            noOptionsText="Seleccionar unidad..."
                                            required
                                        />
                                        <Input
                                            label="Precio de referencia"
                                            type="number"
                                            step="0.01"
                                            {...register('price')}
                                            error={errors.price?.message}
                                            required
                                        />
                                        <div className="flex flex-col gap-1.5">
                                            <Input
                                                label="Stock inicial"
                                                type="number"
                                                step="0.0001"
                                                {...register('stock')}
                                                error={errors.stock?.message}
                                                disabled={isEditing}
                                            />
                                            {isEditing && (
                                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                                    <FileText size={11} />
                                                    Usa Movimientos de Stock para ajustar el
                                                    inventario
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </FormSection>

                                {/* ─ Presentaciones (solo en modo edición) ─ */}
                                {isEditing && productId && (
                                    <FormSection
                                        title="Presentaciones de venta"
                                        description="Formatos en que se vende este producto (saco, libra, caja…)"
                                        icon={Layers}
                                        iconBg="bg-violet-100"
                                        iconColor="text-violet-600"
                                    >
                                        <PresentationsPanel
                                            productId={productId}
                                            baseUnit={watch('base_unit') || 'u'}
                                            presentations={presentations}
                                        />
                                    </FormSection>
                                )}
                            </form>
                        </Card>
                    </div>

                    <QuickActionsSidebar actions={sidebarActions} />
                </div>
            </div>

            {/* ── Confirm Delete Dialog ── */}
            <ConfirmDialog
                isOpen={showConfirmDelete}
                title="¿Eliminar producto?"
                message="Esta acción eliminará permanentemente el producto. No podrás deshacer este cambio."
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
