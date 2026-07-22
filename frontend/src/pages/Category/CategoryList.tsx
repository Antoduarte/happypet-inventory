import React, { useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { useNavigate } from 'react-router-dom';
import { useCategory } from '@/hooks/useCategory';
import type { Category } from '@/interfaces/category';
import { usePagination } from '@/hooks/usePagination';

export const CategoryList: React.FC = () => {
    const { categories, fetchCategories, totalCount, isLoading } = useCategory();
    const navigate = useNavigate();

    // Pagination and Filtering State
    const { pagination, handleSearchChange, handleSortChange, setPage } = usePagination();

    const { currentPage, itemsPerPage, search, ordering } = pagination;

    const loadCategories = useCallback(() => {
        fetchCategories({
            page: currentPage,
            page_size: itemsPerPage,
            search,
            ordering,
        });
    }, [fetchCategories, currentPage, itemsPerPage, search, ordering]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleAddCategory = () => navigate('/categories/new');

    const handleEdit = (category: Category) => {
        navigate(`/categories/edit/${category.id}`);
    };

    const columns: ColumnDef<Category>[] = [
        { header: 'ID', accessorKey: 'id', sortable: true },
        {
            header: 'Nombre de la Categoría',
            accessorKey: 'name',
            sortable: true,
            cell: (item) => <span className="font-medium text-slate-800">{item.name}</span>,
        },
        {
            header: 'Descripción',
            accessorKey: 'description',
            cell: (item) => (
                <span className="text-slate-500 truncate max-w-[200px] inline-block">
                    {item.description || '-'}
                </span>
            ),
        },
        {
            header: 'Tipo',
            accessorKey: 'type',
            sortable: true,
            cell: (item) => {
                return (
                    <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.type === 'product'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        {item.type === 'product' ? 'Producto' : 'Servicio'}
                    </span>
                );
            },
        },
        {
            header: 'Estado',
            accessorKey: 'is_active',
            sortable: true,
            cell: (item) => {
                return (
                    <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        {item.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                );
            },
        },
    ];

    return (
        <div>
            <PageHeader
                title="Categorías"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Categorías' }]}
                action={
                    <Button onClick={handleAddCategory} className="gap-2">
                        <Plus size={18} />
                        Agregar Categoría
                    </Button>
                }
            />

            <Card>
                <DataTable
                    data={categories}
                    columns={columns}
                    searchKey="name"
                    searchPlaceholder="Buscar categorías por nombre..."
                    serverSide
                    isLoading={isLoading}
                    itemsPerPage={pagination.itemsPerPage}
                    totalCount={totalCount}
                    currentPage={pagination.currentPage}
                    onPageChange={setPage}
                    onSearchChange={handleSearchChange}
                    onSortChange={handleSortChange}
                    onRowClick={handleEdit}
                />
            </Card>
        </div>
    );
};
