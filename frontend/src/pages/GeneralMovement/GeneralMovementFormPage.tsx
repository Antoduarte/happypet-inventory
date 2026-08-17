import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, Trash2, TrendingUp, TrendingDown, DollarSign, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormSection } from '@/components/ui/FormSection';
import { TogglePills } from '@/components/ui/TogglePills';
import { QuickActionsSidebar } from '@/components/ui/QuickActionsSidebar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import Loading from '@/components/ui/Loading';
import {
    useGeneralMovement,
    useCreateGeneralMovement,
    useUpdateGeneralMovement,
    useDeleteGeneralMovement,
} from '@/hooks/cash';
import { generalMovementSchema, type GeneralMovementFormData } from '@/schemas/generalMovement';
import type { GeneralMovementType, GeneralMovementPaymentMethod } from '@/interfaces/cash';

const TYPE_OPTIONS = [
    {
        value: 'income' as GeneralMovementType,
        label: 'Ingreso',
        icon: TrendingUp,
        activeClass: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-300',
    },
    {
        value: 'expense' as GeneralMovementType,
        label: 'Egreso',
        icon: TrendingDown,
        activeClass: 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-300',
    },
];

const PAYMENT_OPTIONS = [
    { value: 'cash' as GeneralMovementPaymentMethod, label: 'Efectivo' },
    { value: 'card' as GeneralMovementPaymentMethod, label: 'Tarjeta' },
    { value: 'transfer' as GeneralMovementPaymentMethod, label: 'Transferencia' },
];

const defaultValues: GeneralMovementFormData = {
    type: 'expense',
    name: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
};

export const GeneralMovementFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const movementId = id ? parseInt(id, 10) : null;
    const navigate = useNavigate();

    const { data: movement, isLoading: isFetching } = useGeneralMovement(movementId);
    const { mutate: createMovement, isPending: isCreating } = useCreateGeneralMovement();
    const { mutate: updateMovement, isPending: isUpdating } = useUpdateGeneralMovement();
    const { mutate: deleteMovement, isPending: isDeleting } = useDeleteGeneralMovement();
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<GeneralMovementFormData>({
        resolver: zodResolver(generalMovementSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!movement) return;
        reset({
            type: movement.type,
            name: movement.name,
            description: movement.description || '',
            amount: movement.amount,
            date: movement.date,
            payment_method: movement.payment_method,
        });
    }, [movement, reset]);

    const goToList = useCallback(() => navigate('/general-movements'), [navigate]);

    const handleConfirmDelete = () => {
        if (!movementId) return;
        deleteMovement(movementId, {
            onSuccess: goToList,
        });
    };

    const onSubmit = useCallback(
        (data: GeneralMovementFormData) => {
            const payload = {
                ...data,
                description: data.description || '',
            };

            if (isEditing && movementId) {
                updateMovement({ id: movementId, payload }, { onSuccess: goToList });
            } else {
                createMovement(payload, { onSuccess: goToList });
            }
        },
        [isEditing, movementId, updateMovement, createMovement, goToList],
    );

    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: isEditing ? 'Guardar cambios' : 'Registrar movimiento',
                description: isEditing
                    ? 'Actualizar el movimiento'
                    : 'Guardar el nuevo ingreso o egreso',
                icon: Save,
                variant: 'primary' as const,
                isLoading: isSubmitting || isCreating || isUpdating,
                disabled: isSubmitting || isCreating || isUpdating,
                onClick: () => handleSubmit(onSubmit)(),
            },
            {
                id: 'cancel',
                label: 'Cancelar',
                description: 'Volver al listado',
                icon: X,
                variant: 'default' as const,
                disabled: isSubmitting || isCreating || isUpdating,
                onClick: goToList,
            },
            {
                id: 'delete',
                label: 'Eliminar movimiento',
                description: 'Esta acción es irreversible',
                icon: Trash2,
                variant: 'danger' as const,
                dividerBefore: true,
                hidden: !isEditing,
                isLoading: isDeleting,
                onClick: () => setShowConfirmDelete(true),
            },
        ],
        [
            isEditing,
            isSubmitting,
            isCreating,
            isUpdating,
            handleSubmit,
            onSubmit,
            goToList,
            isDeleting,
        ],
    );

    if (isFetching) return <Loading />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                breadcrumbs={[
                    { label: 'Panel', path: '/' },
                    { label: 'Movimientos generales', path: '/general-movements' },
                    { label: isEditing ? 'Editar' : 'Nuevo' },
                ]}
            />

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                    <Card>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            <FormSection
                                title="Tipo de movimiento"
                                description="Seleccioná si es un ingreso o un egreso"
                                icon={DollarSign}
                                iconBg="bg-brand/10"
                                iconColor="text-brand"
                            >
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <TogglePills
                                            label="Tipo"
                                            required
                                            options={TYPE_OPTIONS}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.type?.message}
                                        />
                                    )}
                                />
                            </FormSection>

                            <FormSection
                                title="Información general"
                                description="Datos principales del ingreso o egreso"
                                icon={Tag}
                                iconBg="bg-violet-100"
                                iconColor="text-violet-600"
                            >
                                <Input
                                    label="Nombre"
                                    placeholder="ej. Pago proveedor de alimento"
                                    {...register('name')}
                                    error={errors.name?.message}
                                    required
                                />

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
                                        placeholder="Detalle adicional del movimiento..."
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none resize-none hover:border-slate-400"
                                    />
                                    {errors.description && (
                                        <p className="text-xs text-red-500">
                                            {errors.description.message}
                                        </p>
                                    )}
                                </div>
                            </FormSection>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input
                                    label="Monto"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    {...register('amount')}
                                    error={errors.amount?.message}
                                    required
                                />

                                <Input
                                    label="Fecha"
                                    type="date"
                                    {...register('date')}
                                    error={errors.date?.message}
                                    required
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        Método de pago <span className="text-red-500">*</span>
                                    </label>
                                    <Controller
                                        name="payment_method"
                                        control={control}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                className="form-select w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none hover:border-slate-400"
                                            >
                                                {PAYMENT_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    />
                                    {errors.payment_method && (
                                        <p className="text-xs text-red-500">
                                            {errors.payment_method.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </form>
                    </Card>
                </div>

                <QuickActionsSidebar actions={sidebarActions} />
            </div>

            <ConfirmDialog
                isOpen={showConfirmDelete}
                title="¿Eliminar movimiento?"
                message="El movimiento se marcará como inactivo. Podrás consultarlo en la base de datos si es necesario."
                confirmLabel="Sí, eliminar"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirmDelete(false)}
            />
        </div>
    );
};
