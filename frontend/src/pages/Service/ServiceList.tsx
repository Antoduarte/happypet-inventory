import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type ColumnDef } from '../../components/ui/DataTable';
import { useNavigate } from 'react-router-dom';
import { useService } from '../../hooks/useService';
import { usePagination } from '../../hooks/usePagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Service } from '../../interfaces/service';
import CategoryFilter from '@/components/table/CategoryFilter';

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<Service>[] = [
    {
        header: 'Nombre',
        accessorKey: 'name',
        sortable: true,
        cell: (item) => <span className="font-medium text-slate-800">{item.name}</span>,
    },
    {
        header: 'Descripción',
        accessorKey: 'description',
        cell: (item) => (
            <span className="text-slate-500 truncate max-w-[220px] inline-block">
                {item.description ?? '—'}
            </span>
        ),
    },
    {
        header: 'Categoría',
        accessorKey: 'category',
        cell: (item) =>
            item.category ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">
                    {item.category.name}
                </span>
            ) : (
                <span className="text-slate-400 text-sm">—</span>
            ),
    },
    {
        header: 'Precio',
        accessorKey: 'price',
        sortable: true,
        cell: (item) => (
            <span className="font-semibold text-slate-800">
                ${parseFloat(item.price).toFixed(2)}
            </span>
        ),
    },
    {
        header: 'Estado',
        accessorKey: 'is_active',
        sortable: true,
        cell: (item) => (
            <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    item.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                }`}
            >
                {item.is_active ? 'Activo' : 'Inactivo'}
            </span>
        ),
    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ServiceList: React.FC = () => {
    const navigate = useNavigate();
    const { services, totalCount, isLoading, fetchServices, deleteService } = useService();
    const { pagination, setPage, handleSearchChange, handleSortChange } = usePagination();
    const { currentPage, itemsPerPage, search, ordering } = pagination;

    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    const handleCategoryChange = (categoryId: number | null) => {
        setSelectedCategoryId(categoryId);
        setPage(1);
    };

    const loadServices = useCallback(() => {
        fetchServices({
            page: currentPage,
            page_size: itemsPerPage,
            search,
            ordering,
            category: selectedCategoryId,
        });
    }, [fetchServices, currentPage, itemsPerPage, search, ordering, selectedCategoryId]);

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    const handleEdit = (service: Service) => navigate(`/services/edit/${service.id}`);
    const handleAdd = () => navigate('/services/new');

    const handleConfirmDelete = async () => {
        if (pendingDeleteId === null) return;
        setIsDeleting(true);
        await deleteService(pendingDeleteId);
        setIsDeleting(false);
        setPendingDeleteId(null);
    };

    return (
        <>
            <div>
                <PageHeader
                    title="Catálogo de Servicios"
                    breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Servicios' }]}
                    action={
                        <Button onClick={handleAdd} className="gap-2">
                            <Plus size={18} />
                            Nuevo Servicio
                        </Button>
                    }
                />

                <Card>
                    <DataTable
                        data={services}
                        columns={columns}
                        searchKey="name"
                        searchPlaceholder="Buscar servicios por nombre..."
                        isLoading={isLoading}
                        serverSide
                        itemsPerPage={itemsPerPage}
                        filters={
                            <CategoryFilter
                                selectedId={selectedCategoryId}
                                onChange={handleCategoryChange}
                                categoryType="service"
                            />
                        }
                        totalCount={totalCount}
                        currentPage={currentPage}
                        onPageChange={setPage}
                        onSearchChange={handleSearchChange}
                        onSortChange={handleSortChange}
                        onRowClick={handleEdit}
                    />
                </Card>
            </div>

            <ConfirmDialog
                isOpen={pendingDeleteId !== null}
                title="¿Eliminar servicio?"
                message="Esta acción desactivará el servicio. Podrás reactvarlo más adelante si es necesario."
                confirmLabel="Sí, eliminar"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setPendingDeleteId(null)}
            />
        </>
    );
};
