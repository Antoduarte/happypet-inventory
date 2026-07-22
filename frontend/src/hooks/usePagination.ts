import { useState, useCallback } from 'react';

interface PaginationState {
    currentPage: number;
    itemsPerPage: number;
    totalCount: number;
    search: string;
    ordering: string;
}

export const usePagination = () => {
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        itemsPerPage: 10,
        totalCount: 0,
        search: '',
        ordering: '',
    });

    const setPage = useCallback((page: number) => {
        setPagination((prev) => ({ ...prev, currentPage: page }));
    }, []);

    const setItemsPerPage = useCallback((itemsPerPage: number) => {
        setPagination((prev) => ({ ...prev, itemsPerPage }));
    }, []);

    const setTotalCount = useCallback((totalCount: number) => {
        setPagination((prev) => ({ ...prev, totalCount }));
    }, []);

    const setSearch = useCallback((search: string) => {
        setPagination((prev) => ({ ...prev, search }));
    }, []);

    const setOrdering = useCallback((ordering: string) => {
        setPagination((prev) => ({ ...prev, ordering }));
    }, []);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1); // Reset to first page on search
    };

    const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
        const order = direction === 'desc' ? `-${key}` : key;
        setOrdering(order);
    };

    return {
        pagination,
        setPage,
        setItemsPerPage,
        setTotalCount,
        setSearch,
        setOrdering,
        handleSearchChange,
        handleSortChange,
    };
};
