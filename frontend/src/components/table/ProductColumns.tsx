import type { ColumnDef } from '../ui/DataTable';
import type { Product } from '../../interfaces/product';
import { formatStock } from '../../utils/formatStock';

export const columns: ColumnDef<Product>[] = [
    {
        header: 'Código',
        accessorKey: 'code',
        sortable: true,
        cell: (item) => (
            <span className="font-mono text-xs text-slate-500">{item.code ?? '—'}</span>
        ),
    },
    {
        header: 'Nombre',
        accessorKey: 'name',
        sortable: true,
        cell: (item) => <span className="font-medium text-slate-800">{item.name}</span>,
    },
    {
        header: 'Categoría',
        accessorKey: 'category',
        sortable: false, // DRF SearchFilter works on category__name, but ordering might need different setup
        cell: (item) => (
            <span className="text-slate-600 truncate max-w-[180px] inline-block">
                {item.category?.name ?? '—'}
            </span>
        ),
    },
    {
        header: 'Precio',
        accessorKey: 'price',
        sortable: true,
        cell: (item) => <span>C${parseFloat(item.price).toFixed(2)}</span>,
    },
    {
        header: 'Stock',
        accessorKey: 'stock',
        sortable: true,
        cell: (item) => {
            const stockValue = parseFloat(item.stock);
            return (
                <span
                    className={`font-semibold ${stockValue === 0 ? 'text-red-500' : stockValue <= 5 ? 'text-amber-500' : 'text-slate-700'}`}
                >
                    {formatStock(item.stock)}
                </span>
            );
        },
    },
    {
        header: 'Descripción',
        accessorKey: 'description',
        sortable: false,
        cell: (item) => (
            <span className="text-slate-500 text-xs truncate max-w-[200px] inline-block">
                {item.description || '—'}
            </span>
        ),
    },
];
