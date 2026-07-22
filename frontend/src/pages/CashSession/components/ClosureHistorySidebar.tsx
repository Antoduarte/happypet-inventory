import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { useSessionClosures } from '../../../hooks/cash';
import type { CashSessionClosure } from '../../../interfaces/cash';

interface ClosureHistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: number;
}

const ITEMS_PER_PAGE = 5;

export const ClosureHistorySidebar: React.FC<ClosureHistorySidebarProps> = ({
    isOpen,
    onClose,
    sessionId,
}) => {
    const { data: closures, isLoading } = useSessionClosures(sessionId);
    const [currentPage, setCurrentPage] = useState(1);

    if (!isOpen) return null;

    const totalPages = closures ? Math.ceil(closures.length / ITEMS_PER_PAGE) : 0;
    const paginatedClosures = closures?.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

    const handleClose = () => {
        onClose();
        setCurrentPage(1);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-NI', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getDifferenceClass = (diff: string) => {
        const value = parseFloat(diff);
        if (value === 0) return 'text-emerald-600';
        if (value > 0) return 'text-blue-600';
        return 'text-rose-600';
    };

    const formatDifference = (diff: string) => {
        const value = parseFloat(diff);
        const sign = value >= 0 ? '+' : '';
        return `${sign}C$${value.toFixed(2)}`;
    };

    const totalClosures = closures?.length || 0;
    const startItem = totalClosures > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalClosures);

    return (
        <div className="fixed inset-0 -top-5 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-100">
                    <div className="flex items-center gap-3">
                        <Clock size={20} className="text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-800">
                            Historial de Cierres
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-5 animate-pulse"
                                >
                                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-3 bg-slate-200 rounded" />
                                        <div className="h-3 bg-slate-200 rounded" />
                                        <div className="h-3 bg-slate-200 rounded" />
                                        <div className="h-3 bg-slate-200 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !closures || closures.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Clock size={48} className="text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No hay cierres registrados</p>
                            <p className="text-slate-400 text-sm mt-1">
                                Los cierres aparecerán aquí cuando cierres la caja
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedClosures?.map((closure, index) => (
                                <ClosureCard
                                    key={closure.id}
                                    closure={closure}
                                    index={(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                    formatTime={formatTime}
                                    formatDate={formatDate}
                                    getDifferenceClass={getDifferenceClass}
                                    formatDifference={formatDifference}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {!isLoading && totalClosures > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                {startItem} - {endItem} de {totalClosures}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ClosureCardProps {
    closure: CashSessionClosure;
    index: number;
    formatTime: (date: string) => string;
    formatDate: (date: string) => string;
    getDifferenceClass: (diff: string) => string;
    formatDifference: (diff: string) => string;
}

const ClosureCard: React.FC<ClosureCardProps> = ({
    closure,
    index,
    formatTime,
    formatDate,
    getDifferenceClass,
    formatDifference,
}) => {
    return (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold bg-slate-800 text-white rounded-full">
                        {index}
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                        {formatDate(closure.closed_at)}
                    </span>
                </div>
                <span className="text-sm text-slate-500">{formatTime(closure.closed_at)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-slate-600 text-xs uppercase tracking-wide">Esperado</p>
                    <p className="font-medium text-slate-700">
                        C${parseFloat(closure.expected_amount).toFixed(2)}
                    </p>
                </div>
                <div>
                    <p className="text-slate-600 text-xs uppercase tracking-wide">Contado</p>
                    <p className="font-medium text-slate-700">
                        C${parseFloat(closure.counted_amount).toFixed(2)}
                    </p>
                </div>
                <div className="col-span-2">
                    <p className="text-slate-600 text-xs uppercase tracking-wide">Diferencia</p>
                    <p className={`font-semibold ${getDifferenceClass(closure.difference)}`}>
                        {formatDifference(closure.difference)}
                    </p>
                </div>
            </div>

            {closure.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nota</p>
                    <p className="text-sm text-slate-600 italic">{closure.notes}</p>
                </div>
            )}
        </div>
    );
};
