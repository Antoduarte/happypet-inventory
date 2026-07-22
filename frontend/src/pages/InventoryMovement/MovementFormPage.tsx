import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, X, Package, Hash } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { FormSection } from '@/components/ui/FormSection';
import { useStock } from '../../hooks/useStock';
import { useProduct } from '../../hooks/useProduct';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { QuickActionsSidebar } from '@/components/ui/QuickActionsSidebar';
import { type ComboboxOption } from '../Sales/components/SearchableCombobox';
import { presentationService } from '../../services/presentation';
import { LineItemRow, type LineItem } from './components/LineItemRow';
import { ManagerAuthModal } from './ManagerAuthModal';

const breadcrumbs = [
    { label: 'Panel', path: '/' },
    { label: 'Movimientos', path: '/movements' },
    { label: 'Registrar' },
];

interface MovementFormData {
    movement_type: 'in' | 'out';
    notes: string;
}

const MovementFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { createMovement } = useStock();
    const { products, fetchProducts } = useProduct();
    const { isCashier } = usePermission();
    const { managerCode, setManagerAuthorization } = useAuth();

    useEffect(() => {
        fetchProducts({ page_size: 200 });
    }, [fetchProducts]);

    const {
        register,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<MovementFormData>({
        defaultValues: {
            movement_type: 'in',
            notes: '',
        },
    });

    const [items, setItems] = React.useState<LineItem[]>([
        { product_id: null, presentation_id: null, quantity: 1 },
    ]);

    const [presentationsMap, setPresentationsMap] = React.useState<
        Record<number, { id: number; name: string; multiplier: string }[]>
    >({});
    const [loadingPresMap, setLoadingPresMap] = React.useState<Record<number, boolean>>({});

    const loadPresentations = (productId: number, rowIndex: number) => {
        if (presentationsMap[productId]) return;
        setLoadingPresMap((prev) => ({ ...prev, [rowIndex]: true }));
        presentationService
            .getPresentations({ product: productId, is_active: true, page_size: 50 })
            .then((r) =>
                setPresentationsMap((prev) => ({
                    ...prev,
                    [productId]: r.results || [],
                })),
            )
            .catch(() =>
                setPresentationsMap((prev) => ({
                    ...prev,
                    [productId]: [],
                })),
            )
            .finally(() => setLoadingPresMap((prev) => ({ ...prev, [rowIndex]: false })));
    };

    const addItem = () =>
        setItems((prev) => [...prev, { product_id: null, presentation_id: null, quantity: 1 }]);

    const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

    const updateItem = (index: number, field: keyof LineItem, value: number | null) =>
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        );

    const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
    const [pinModalOpen, setPinModalOpen] = React.useState(false);
    const [pendingData, setPendingData] = React.useState<MovementFormData | null>(null);

    const validationError = useMemo(() => {
        if (items.length === 0) return 'Agrega al menos un producto.';
        for (const item of items) {
            if (!item.product_id) return 'Todos los productos son requeridos.';
            if (item.quantity <= 0) return 'Todas las cantidades deben ser mayores a 0.';
        }
        return null;
    }, [items]);

    const goToMovements = useCallback(() => navigate('/movements'), [navigate]);

    const submitMovement = useCallback(
        async (data: MovementFormData, code?: string) => {
            const result = await createMovement({
                movement_type: data.movement_type,
                notes: data.notes || null,
                write_items: items.map((item) => ({
                    product_id: item.product_id!,
                    presentation_id: item.presentation_id,
                    quantity: item.quantity,
                })),
                ...(code ? { manager_code: code } : {}),
            });
            if (result) goToMovements();
        },
        [createMovement, goToMovements, items],
    );

    const handleFormSubmit = useCallback(
        async (data: MovementFormData) => {
            setHasAttemptedSubmit(true);
            if (validationError) return;

            // Los cajeros requieren el código de autorización de un gerente/admin.
            // Solo se pide una vez por sesión de login: si ya está cacheado, se reutiliza.
            if (isCashier && !managerCode) {
                setPendingData(data);
                setPinModalOpen(true);
                return;
            }

            await submitMovement(data, isCashier ? (managerCode ?? undefined) : undefined);
        },
        [validationError, isCashier, managerCode, submitMovement],
    );

    const sidebarActions = useMemo(
        () => [
            {
                id: 'save',
                label: 'Registrar movimiento',
                description: 'Guardar y actualizar el stock',
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
                onClick: goToMovements,
            },
        ],
        [isSubmitting, handleSubmit, handleFormSubmit, goToMovements],
    );

    const productOptions: ComboboxOption[] = useMemo(
        () =>
            products.map((p) => ({
                id: p.id,
                label: p.name,
                badge: `${p.stock} ${p.base_unit}`,
                badgeVariant:
                    parseFloat(p.stock) === 0
                        ? 'error'
                        : parseFloat(p.stock) < 10
                          ? 'warning'
                          : 'success',
                meta: p.code ? `Code: ${p.code}` : undefined,
            })),
        [products],
    );

    return (
        <div>
            <PageHeader title="Registrar Movimiento de Stock" breadcrumbs={breadcrumbs} />

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                    <Card>
                        <form
                            onSubmit={handleSubmit(handleFormSubmit as never)}
                            className="space-y-8"
                        >
                            <FormSection
                                title="Detalle del movimiento"
                                description="Cantidad de unidades y motivo del ajuste"
                                icon={Hash}
                                iconBg="bg-slate-100"
                                iconColor="text-slate-600"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            Tipo de Movimiento *
                                        </label>
                                        <select
                                            {...register('movement_type')}
                                            className="form-select w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none hover:border-slate-400"
                                        >
                                            <option value="in">Entrada de Stock (+)</option>
                                            <option value="out">Salida de Stock (-)</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            Notas{' '}
                                            <span className="text-slate-400 font-normal">
                                                (opcional)
                                            </span>
                                        </label>
                                        <textarea
                                            {...register('notes')}
                                            rows={1}
                                            placeholder="ej. Envío recibido del proveedor"
                                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none resize-none hover:border-slate-400"
                                        />
                                    </div>
                                </div>
                            </FormSection>

                            <FormSection
                                title="Productos"
                                description="Agrega uno o más productos al movimiento"
                                icon={Package}
                                iconBg="bg-brand/10"
                                iconColor="text-brand"
                            >
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="p-4 mt-3 border border-dashed border-slate-500 hover:border-brand-light hover:bg-brand-light/5 text-slate-600 hover:text-brand text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M5 12h14" />
                                        <path d="M12 5v14" />
                                    </svg>
                                    Agregar producto
                                </button>
                                <div className="border border-slate-200 rounded-xl">
                                    <div className="bg-slate-50 px-4 py-2 grid grid-cols-[1fr_1fr_100px_40px] gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        <span>Producto</span>
                                        <span>Presentación</span>
                                        <span className="text-right">Cantidad</span>
                                        <span></span>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {items.map((item, index) => (
                                            <LineItemRow
                                                key={index}
                                                item={item}
                                                productOptions={productOptions}
                                                presentationOptions={
                                                    item.product_id
                                                        ? presentationsMap[item.product_id] || []
                                                        : []
                                                }
                                                isLoadingPresentations={
                                                    item.product_id
                                                        ? !!loadingPresMap[index]
                                                        : false
                                                }
                                                onProductChange={(id) => {
                                                    updateItem(index, 'product_id', id);
                                                    updateItem(index, 'presentation_id', null);
                                                    loadPresentations(id, index);
                                                }}
                                                onPresentationChange={(id) =>
                                                    updateItem(index, 'presentation_id', id)
                                                }
                                                onQuantityChange={(qty) =>
                                                    updateItem(index, 'quantity', qty)
                                                }
                                                onRemove={
                                                    items.length > 1
                                                        ? () => removeItem(index)
                                                        : undefined
                                                }
                                                baseUnit={
                                                    products.find((p) => p.id === item.product_id)
                                                        ?.base_unit ?? ''
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>

                                {hasAttemptedSubmit && validationError && (
                                    <p className="text-xs text-red-500 mt-2">{validationError}</p>
                                )}
                            </FormSection>
                        </form>
                    </Card>
                </div>

                <QuickActionsSidebar actions={sidebarActions} />
            </div>

            <ManagerAuthModal
                isOpen={pinModalOpen}
                onClose={() => setPinModalOpen(false)}
                onSuccess={(code) => {
                    setManagerAuthorization(code); // cachea para el resto de la sesión de login
                    setPinModalOpen(false);
                    if (pendingData) {
                        void submitMovement(pendingData, code);
                        setPendingData(null);
                    }
                }}
            />
        </div>
    );
};

export { MovementFormPage };
