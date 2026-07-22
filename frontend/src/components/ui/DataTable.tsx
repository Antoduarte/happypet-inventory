import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from './Input';
import { Pagination } from './Pagination';

export interface ColumnDef<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    sortable?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    searchable?: boolean;
    searchKey?: keyof T;
    searchPlaceholder?: string;
    itemsPerPage?: number;
    onRowClick?: (item: T) => void;
    isLoading?: boolean;

    filters?: React.ReactNode;

    // Server-side props
    serverSide?: boolean;
    totalCount?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    onSearchChange?: (term: string) => void;
    onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
}

export function DataTable<T>({
    data,
    columns,
    searchable = true,
    searchKey,
    searchPlaceholder = 'Buscar...',
    itemsPerPage = 10,
    onRowClick,
    isLoading = false,
    serverSide = false,
    totalCount: externalTotalCount,
    currentPage: externalCurrentPage,
    filters,
    onPageChange,
    onSearchChange,
    onSortChange,
}: DataTableProps<T>) {
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalCurrentPage, setInternalCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof T | null;
        direction: 'asc' | 'desc';
    }>({
        key: null,
        direction: 'asc',
    });

    const currentPage = serverSide ? (externalCurrentPage ?? 1) : internalCurrentPage;
    const searchTerm = internalSearchTerm;

    const handleSort = (key?: keyof T) => {
        if (!key) return;

        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }

        setSortConfig({ key, direction });

        if (serverSide && onSortChange) {
            onSortChange(String(key), direction);
        }
    };

    const processedData = useMemo(() => {
        if (serverSide) return data;

        let result = [...data];

        // Search
        if (searchable && searchKey && searchTerm) {
            result = result.filter((item) => {
                const value = item[searchKey];
                return String(value).toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        // Sort
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, searchTerm, searchKey, searchable, sortConfig, serverSide]);

    const totalCount = serverSide ? (externalTotalCount ?? 0) : processedData.length;
    // const totalPages = Math.ceil(totalCount / itemsPerPage);

    const paginatedData = useMemo(() => {
        if (serverSide) return data;
        return processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [processedData, currentPage, itemsPerPage, serverSide, data]);

    const handlePageChange = (page: number) => {
        if (serverSide && onPageChange) {
            onPageChange(page);
            return;
        }

        setInternalCurrentPage(page);
    };

    const handleSearchChange = (value: string) => {
        setInternalSearchTerm(value);
        if (serverSide) {
            if (onSearchChange) onSearchChange(value);
            return;
        }

        setInternalCurrentPage(1);
    };

    return (
        <div className="flex flex-col gap-4">
            {searchable && (
                <div className="flex gap-2 items-center">
                    <div className="relative w-full max-w-sm">
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10"
                        />
                        <Search className="absolute left-3 top-[10px] text-slate-400" size={18} />
                    </div>
                    {filters}
                </div>
            )}

            {!searchable && filters}

            <div className="bg-white border text-left border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-6 py-4 ${col.sortable ? 'cursor-pointer hover:bg-slate-100 transition-colors select-none' : ''}`}
                                        onClick={() => col.sortable && handleSort(col.accessorKey)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.header}
                                            {col.sortable && (
                                                <span className="text-slate-400 flex flex-col">
                                                    {sortConfig.key === col.accessorKey ? (
                                                        sortConfig.direction === 'asc' ? (
                                                            <ArrowUp
                                                                size={14}
                                                                className="text-brand"
                                                            />
                                                        ) : (
                                                            <ArrowDown
                                                                size={14}
                                                                className="text-brand"
                                                            />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown size={14} />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        {columns.map((_, colIdx) => (
                                            <td key={colIdx} className="px-6 py-4">
                                                <div className="h-4 bg-slate-200 rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((row, rowIdx) => (
                                    <tr
                                        key={rowIdx}
                                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                        onClick={() => onRowClick && onRowClick(row)}
                                    >
                                        {columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className="px-6 py-4 text-slate-700 whitespace-nowrap"
                                            >
                                                {col.cell
                                                    ? col.cell(row)
                                                    : col.accessorKey
                                                      ? String(row[col.accessorKey])
                                                      : ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-6 py-8 text-center text-slate-500"
                                    >
                                        No se encontraron datos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={itemsPerPage}
                    onPageChange={handlePageChange}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
