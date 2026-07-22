import React, { useEffect, useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '../../hooks/useProduct';
import type { Product } from '../../interfaces/product';
import { usePagination } from '../../hooks/usePagination';
import { columns } from '../../components/table/ProductColumns';
import { CategoryFilter } from '../../components/table/CategoryFilter';

export const ProductList: React.FC = () => {
    const { products, totalCount, isLoading, fetchProducts } = useProduct();
    const navigate = useNavigate();

    // Pagination and Filtering State
    const { pagination, setPage, handleSearchChange, handleSortChange } = usePagination();
    const { currentPage, itemsPerPage, search, ordering } = pagination;

    // Category filter state
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    const loadProducts = useCallback(() => {
        fetchProducts({
            page: currentPage,
            page_size: itemsPerPage,
            search,
            ordering,
            category: selectedCategoryId ?? undefined,
        });
    }, [fetchProducts, currentPage, itemsPerPage, search, ordering, selectedCategoryId]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    /** Reset to page 1 whenever the category filter changes */
    const handleCategoryChange = (categoryId: number | null) => {
        setSelectedCategoryId(categoryId);
        setPage(1);
    };

    const handleAdd = () => {
        navigate('/products/new');
    };

    const handleEdit = ({ id }: Product) => {
        navigate(`/products/edit/${id}`);
    };

    return (
        <div>
            <PageHeader
                title="Productos"
                breadcrumbs={[{ label: 'Panel', path: '/' }, { label: 'Productos' }]}
                action={
                    <Button onClick={handleAdd} className="gap-2">
                        <Plus size={18} />
                        Agregar Producto
                    </Button>
                }
            />

            <Card>
                <DataTable
                    data={products}
                    columns={columns}
                    searchKey="name"
                    searchPlaceholder="Buscar productos por nombre..."
                    isLoading={isLoading}
                    serverSide
                    itemsPerPage={itemsPerPage}
                    totalCount={totalCount}
                    currentPage={currentPage}
                    filters={
                        <CategoryFilter
                            selectedId={selectedCategoryId}
                            onChange={handleCategoryChange}
                        />
                    }
                    onPageChange={setPage}
                    onSearchChange={handleSearchChange}
                    onSortChange={handleSortChange}
                    onRowClick={handleEdit}
                />
            </Card>
        </div>
    );
};
