/**
 * PresentationFormPage
 *
 * Pantalla para crear o editar una presentación de producto
 * (ej: "Saco 100 lb", "Libra suelta", "Botella 500 ml").
 *
 * Ruta:
 *   /products/:productId/presentations/new
 *   /products/:productId/presentations/edit/:id
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Trash2, Layers, Hash, ToggleLeft, ArrowLeft, Info } from 'lucide-react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { TogglePills } from '@/components/ui/TogglePills';
import { QuickActionsSidebar } from '@/components/ui/QuickActionsSidebar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePresentation } from '../../hooks/usePresentation';
import { useProduct } from '../../hooks/useProduct';
import Loading from '../../components/ui/Loading';

// ─── Schema ────────────────────────────────────────────────────────────────────

const presentationSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    multiplier: z.coerce
        .number({ message: 'El multiplicador debe ser un número' })
        .positive('El multiplicador debe ser mayor a 0'),
    price: z.coerce
        .number({ message: 'El precio debe ser un número' })
        .min(0, 'El precio no puede ser negativo'),
    barcode: z.string().optional().or(z.literal('')),
    is_active: z.boolean().default(true),
});

type PresentationFormData = z.infer<typeof presentationSchema>;

// ─── Static options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    {
        value: 'true' as const,
        label: 'Activa',
        activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-300',
    },
    {
        value: 'false' as const,
        label: 'Inactiva',
        activeClass: 'border-slate-400 bg-slate-400 text-white shadow-sm shadow-slate-200',
    },
] satisfies Array<{ value: string; label: string; activeClass: string }>;

// ─── Component ─────────────────────────────────────────────────────────────────

export const PresentationFormPage: React.FC = () => {
    const { productId, id } = useParams<{ productId: string; id: string }>();
    const productIdNum = productId ? parseInt(productId, 10) : null;
    const presentationId = id ? parseInt(id, 10) : null;
    const isEditing = Boolean(presentationId);

    const navigate = useNavigate();
    const { fetchProductById } = useProduct();
    const { addPresentation, updatePresentation, deletePresentation, fetchPresentationById } =
        usePresentation();

    const [isFetching, setIsFetching] = useState(isEditing);
    const [productName, setProductName] = useState<string>('');
    const [baseUnit, setBaseUnit] = useState<string>('u');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<PresentationFormData>({
        resolver: zodResolver(presentationSchema),
        defaultValues: {
            name: '',
            multiplier: 1,
            price: 0,
            barcode: '',
            is_active: true,
        },
    });

    // Load product info (for breadcrumbs + unit hint)
    useEffect(() => {
        if (!productIdNum) return;
        fetchProductById(productIdNum).then((p) => {
            if (p) {
                setProductName(p.name);
                setBaseUnit(p.base_unit);
            }
        });
    }, [productIdNum, fetchProductById]);

    // Load existing presentation if editing
    useEffect(() => {
        if (!isEditing || !presentationId) return;
        fetchPresentationById(presentationId)
            .then((p) => {
                if (!p) {
                    goToProduct();
                    return;
                }
                reset({
                    name: p.name,
                    multiplier: parseFloat(p.multiplier),
                    price: parseFloat(p.price),
                    barcode: p.barcode ?? '',
                    is_active: p.is_active,
                });
            })
            .catch(goToProduct)
            .finally(() => setIsFetching(false));
    }, [isEditing, presentationId]);

    const goToProduct = () => navigate(`/products/edit/${productIdNum}`);

    const handleFormSubmit = async (data: PresentationFormData) => {
        if (!productIdNum) return;

        const payload = {
            product_id: productIdNum,
            name: data.name,
            multiplier: data.multiplier,
            price: data.price,
            barcode: data.barcode || null,
            is_active: data.is_active,
        };

        if (isEditing && presentationId) {
            const result = await updatePresentation(presentationId, payload);
            if (result) goToProduct();
            return;
        }

        const result = await addPresentation(payload);
        if (result) goToProduct();
    };

    const handleConfirmDelete = async () => {
        if (!presentationId) return;
        setIsDeleting(true);
        const success = await deletePresentation(presentationId);
        setIsDeleting(false);
        setShowConfirmDelete(false);
        if (success) goToProduct();
    };

    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: isEditing ? 'Guardar cambios' : 'Crear presentación',
                description: isEditing
                    ? 'Actualizar la presentación'
                    : 'Registrar nueva presentación',
                icon: Save,
                variant: 'primary' as const,
                isLoading: isSubmitting,
                disabled: isSubmitting,
                onClick: () => handleSubmit(handleFormSubmit)(),
            },
            {
                id: 'back',
                label: 'Volver al producto',
                description: 'Sin guardar cambios',
                icon: ArrowLeft,
                variant: 'default' as const,
                disabled: isSubmitting,
                onClick: goToProduct,
            },
            {
                id: 'delete',
                label: 'Eliminar presentación',
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

    if (isFetching) return <Loading />;

    return (
        <>
            <div>
                <PageHeader
                    title={isEditing ? 'Editar Presentación' : 'Nueva Presentación'}
                    breadcrumbs={[
                        { label: 'Panel', path: '/' },
                        { label: 'Productos', path: '/products' },
                        {
                            label: productName || `Producto #${productIdNum}`,
                            path: `/products/edit/${productIdNum}`,
                        },
                        { label: isEditing ? 'Editar presentación' : 'Nueva presentación' },
                    ]}
                />

                <div className="flex gap-6 items-start">
                    {/* ── Main Form ── */}
                    <div className="flex-1 min-w-0">
                        {/* Context banner */}
                        <div className="mb-4 p-4 bg-brand/5 border border-brand/20 rounded-xl flex items-start gap-3">
                            <Info size={16} className="text-brand shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-600">
                                <span className="font-semibold text-brand">Unidad base: </span>
                                <span className="font-medium">{baseUnit}</span>
                                {' — '}
                                El campo <strong>Multiplicador</strong> define cuántas{' '}
                                <em>{baseUnit}</em> contiene esta presentación.
                                {' ej: Saco de 100 lb → multiplicador = '}
                                <strong>100</strong>
                            </div>
                        </div>

                        <Card>
                            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
                                {/* ─ Identidad ─ */}
                                <FormSection
                                    title="Identidad de la presentación"
                                    description="Nombre visible y código de barras"
                                    icon={Layers}
                                    iconBg="bg-brand/10"
                                    iconColor="text-brand"
                                >
                                    <Input
                                        label="Nombre"
                                        placeholder='ej: "Saco 100 lb", "Libra suelta", "Botella 500 ml"'
                                        {...register('name')}
                                        error={errors.name?.message}
                                        required
                                    />
                                    <Input
                                        label="Código de barras"
                                        placeholder="EAN-13 / UPC (opcional)"
                                        {...register('barcode')}
                                        error={errors.barcode?.message}
                                    />
                                </FormSection>

                                {/* ─ Equivalencia y precio ─ */}
                                <FormSection
                                    title="Equivalencia y precio"
                                    description={`Cuántas ${baseUnit} representa y su precio de venta`}
                                    icon={Hash}
                                    iconBg="bg-indigo-100"
                                    iconColor="text-indigo-600"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Input
                                                label={`Multiplicador (en ${baseUnit})`}
                                                type="number"
                                                step="0.0001"
                                                min="0.0001"
                                                placeholder="ej: 100"
                                                {...register('multiplier')}
                                                error={errors.multiplier?.message}
                                                required
                                            />
                                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Hash size={9} />
                                                {`unidades_descontadas = cantidad_vendida × multiplicador`}
                                            </p>
                                        </div>
                                        <Input
                                            label="Precio de venta (C$)"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            {...register('price')}
                                            error={errors.price?.message}
                                            required
                                        />
                                    </div>
                                </FormSection>

                                {/* ─ Estado ─ */}
                                <FormSection
                                    title="Estado"
                                    description="Controla si la presentación está disponible para ventas"
                                    icon={ToggleLeft}
                                    iconBg="bg-emerald-100"
                                    iconColor="text-emerald-600"
                                >
                                    <Controller
                                        name="is_active"
                                        control={control}
                                        render={({ field }) => (
                                            <TogglePills
                                                label="Disponibilidad"
                                                required
                                                options={STATUS_OPTIONS}
                                                value={field.value ? 'true' : 'false'}
                                                onChange={(v) => field.onChange(v === 'true')}
                                            />
                                        )}
                                    />
                                </FormSection>
                            </form>
                        </Card>
                    </div>

                    <QuickActionsSidebar actions={sidebarActions} />
                </div>
            </div>

            <ConfirmDialog
                isOpen={showConfirmDelete}
                title="¿Eliminar presentación?"
                message="Esta presentación no podrá usarse en nuevas ventas. No podrás deshacer este cambio."
                confirmLabel="Sí, eliminar"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmDelete(false)}
            />
        </>
    );
};
