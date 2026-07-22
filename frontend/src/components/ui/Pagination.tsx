import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalCount,
    pageSize,
    onPageChange,
    isLoading = false,
}) => {
    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    return (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200">
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || isLoading}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-medium">{startItem}</span> a{' '}
                        <span className="font-medium">{endItem}</span> de{' '}
                        <span className="font-medium">{totalCount}</span> resultados
                    </p>
                </div>
                <div>
                    <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                    >
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="sr-only">Anterior</span>
                            <ChevronLeft size={20} />
                        </button>

                        {/* Pagination Numbers */}
                        <div className="flex items-center">
                            {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNumber = i + 1;
                                // Simple logic to show only a few pages if there are many
                                // For now, let's keep it simple as the previous implementation
                                return (
                                    <button
                                        key={pageNumber}
                                        onClick={() => onPageChange(pageNumber)}
                                        disabled={isLoading}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                            currentPage === pageNumber
                                                ? 'z-10 bg-brand border-brand text-white'
                                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages || isLoading}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="sr-only">Siguiente</span>
                            <ChevronRight size={20} />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};
