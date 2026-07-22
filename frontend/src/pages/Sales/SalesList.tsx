import React, { useEffect } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type ColumnDef } from '../../components/ui/DataTable';
import { useSale } from '../../hooks/useSale';
import { useAuth } from '../../hooks/useAuth';
import type { Sale } from '../../interfaces/sale';

/** Maps backend payment_type values to readable Spanish labels. */
const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
};

/** Maps backend status values to readable Spanish labels. */
const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    completed: 'Completado',
    cancelled: 'Cancelado',
};

/** CSS classes for each sale status badge. */
const STATUS_CLASSES: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
};

export const SalesList: React.FC = () => {
    const { sales, fetchSales } = useSale();
    const navigate = useNavigate();
    const { cashSessionId, cashSessionStatus } = useAuth();

    // Load sales on mount
    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handleOpenForm = () => {
        if (cashSessionStatus === 'suspended' && cashSessionId) {
            navigate(`/cash/resume/${cashSessionId}`);
        } else if (cashSessionStatus !== 'open') {
            navigate('/cash/open');
        } else {
            navigate('/sales/new');
        }
    };

    const handleRowClick = (sale: Sale) => {
        navigate(`/sales/${sale.id}`);
    };

    const columns: ColumnDef<Sale>[] = [
        {
            header: 'ID',
            accessorKey: 'id',
            sortable: true,
        },
        {
            header: 'Fecha',
            accessorKey: 'sale_date',
            sortable: true,
            cell: (item) => (
                <span className="text-slate-600 font-medium">
                    {new Date(item.sale_date).toLocaleDateString()}{' '}
                    {new Date(item.sale_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
            ),
        },
        {
            header: 'Artículos',
            accessorKey: 'quantity',
            sortable: true,
            cell: (item) => <span className="font-medium text-slate-700">{item.quantity}</span>,
        },
        {
            header: 'Total',
            accessorKey: 'total_price',
            sortable: true,
            cell: (item) => (
                <span className="font-semibold text-slate-800">
                    C${parseFloat(item.total_price).toFixed(2)}
                </span>
            ),
        },
        {
            header: 'Pago',
            accessorKey: 'payment_type',
            sortable: true,
            cell: (item) => (
                <span className="capitalize text-slate-600">
                    {PAYMENT_LABELS[item.payment_type] ?? item.payment_type}
                </span>
            ),
        },
        {
            header: 'Estado',
            accessorKey: 'status',
            sortable: true,
            cell: (item) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        STATUS_CLASSES[item.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                >
                    {STATUS_LABELS[item.status] ?? item.status}
                </span>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Registro de Ventas"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Ventas' }]}
                action={
                    <Button onClick={handleOpenForm} className="gap-2">
                        <Plus size={18} />
                        Nueva Venta
                    </Button>
                }
            />

            {cashSessionStatus !== 'open' && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-800">
                                {cashSessionStatus === 'suspended'
                                    ? 'La caja está suspendida. Debes reanudarla para procesar ventas.'
                                    : 'No hay caja abierta. Debes abrir una caja para procesar ventas.'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            if (cashSessionStatus === 'suspended' && cashSessionId) {
                                navigate(`/cash/resume/${cashSessionId}`);
                            } else {
                                navigate('/cash/open');
                            }
                        }}
                    >
                        {cashSessionStatus === 'suspended' ? 'Reabrir Caja' : 'Abrir Caja'}
                    </Button>
                </div>
            )}

            <Card>
                <DataTable
                    data={sales}
                    columns={columns}
                    searchKey="id"
                    searchPlaceholder="Buscar por ID de Pedido..."
                    onRowClick={handleRowClick}
                />
            </Card>
        </div>
    );
};
