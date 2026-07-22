import React, { useEffect, useState } from 'react';
import { Tag, X, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single option shown in the dropdown */
export interface SelectFilterOption {
    /** Unique numeric identifier */
    id: number;
    /** Text displayed in the list */
    label: string;
}

/** State object returned by the async loader */
export interface SelectFilterFetchResult {
    options: SelectFilterOption[];
    error?: string;
}

export interface SelectFilterProps {
    /**
     * Async function that loads the options.
     * Called once on mount and again when the user clicks "Reintentar".
     */
    fetchOptions: () => Promise<SelectFilterFetchResult>;

    /** Currently selected option ID (null = none selected / "all") */
    selectedId: number | null;

    /** Fired when the user picks an option or clears the selection */
    onChange: (id: number | null) => void;

    /**
     * Label shown in the trigger button when nothing is selected.
     * Defaults to "Filtrar".
     */
    placeholder?: string;

    /**
     * Label for the "all" option inside the dropdown.
     * Defaults to "Todas las opciones".
     */
    allLabel?: string;

    /** Icon shown in the trigger button. Defaults to the Tag icon. */
    icon?: LucideIcon;

    /** Accessible label for the dropdown listbox */
    ariaLabel?: string;

    /** Unique identifier used for aria relationships and click-outside detection */
    filterId?: string;

    /** Extra CSS classes for the root wrapper */
    className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SelectFilter
 *
 * A generic, accessible dropdown filter that works with any list of options.
 * Handles its own loading, error, and empty states. Options are loaded once
 * via the `fetchOptions` async prop and cached for the lifetime of the component.
 *
 * @example — category filter
 * ```tsx
 * <SelectFilter
 *   filterId="category"
 *   placeholder="Categoría"
 *   allLabel="Todas las categorías"
 *   selectedId={selectedCategoryId}
 *   onChange={handleCategoryChange}
 *   fetchOptions={async () => {
 *     const res = await categoryService.getCategories({ type: 'product', page_size: 100 });
 *     return { options: res.results.map((c) => ({ id: c.id, label: c.name })) };
 *   }}
 * />
 * ```
 *
 * @example — status filter
 * ```tsx
 * <SelectFilter
 *   filterId="status"
 *   placeholder="Estado"
 *   allLabel="Todos los estados"
 *   selectedId={selectedStatus}
 *   onChange={setSelectedStatus}
 *   fetchOptions={async () => ({
 *     options: [
 *       { id: 1, label: 'Activo' },
 *       { id: 0, label: 'Inactivo' },
 *     ],
 *   })}
 * />
 * ```
 */
export const SelectFilter: React.FC<SelectFilterProps> = ({
    fetchOptions,
    selectedId,
    onChange,
    placeholder = 'Filtrar',
    allLabel = 'Todas las opciones',
    icon: Icon = Tag,
    ariaLabel = 'Seleccionar filtro',
    filterId = 'select-filter',
    className = '',
}) => {
    const [options, setOptions] = useState<SelectFilterOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await fetchOptions();
            if (result.error) {
                setError(result.error);
            } else {
                setOptions(result.options);
            }
        } catch {
            setError('Error al cargar las opciones.');
        } finally {
            setIsLoading(false);
        }
    };

    // Load options once on mount

    useEffect(() => {
        load();
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(`[data-filter-id="${filterId}"]`)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen, filterId]);

    const selectedOption = options.find((o) => o.id === selectedId) ?? null;
    const isActive = selectedId !== null;

    const handleSelect = (id: number | null) => {
        onChange(id);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const triggerClass = [
        'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium',
        'transition-all duration-150 cursor-pointer select-none',
        isActive
            ? 'bg-brand/10 border-brand text-brand shadow-sm shadow-brand/10'
            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
    ].join(' ');

    return (
        <div data-filter-id={filterId} className={`relative ${className}`}>
            {/* Trigger button */}
            <button
                type="button"
                id={`${filterId}-trigger`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={isActive ? `Filtro activo: ${selectedOption?.label}` : placeholder}
                onClick={() => setIsOpen((prev) => !prev)}
                className={triggerClass}
            >
                <Icon size={15} className="shrink-0" aria-hidden />

                <span className="max-w-[160px] truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                {isActive ? (
                    <span
                        role="button"
                        aria-label="Limpiar filtro"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) =>
                            e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)
                        }
                        className="ml-0.5 rounded-full p-0.5 hover:bg-brand/20 transition-colors"
                    >
                        <X size={13} />
                    </span>
                ) : (
                    <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div
                    role="listbox"
                    aria-label={ariaLabel}
                    className={[
                        'absolute left-0 z-30 mt-1.5 min-w-[220px] rounded-xl border border-slate-200',
                        'bg-white shadow-lg shadow-slate-200/70 overflow-hidden',
                        'animate-in fade-in slide-in-from-top-1 duration-100',
                    ].join(' ')}
                >
                    {/* Loading */}
                    {isLoading && (
                        <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-slate-500">
                            <Loader2 size={15} className="animate-spin shrink-0 text-brand" />
                            Cargando…
                        </div>
                    )}

                    {/* Error */}
                    {!isLoading && error && (
                        <div className="px-4 py-3 text-sm text-red-600">
                            <div className="flex items-center gap-2 mb-1.5">
                                <AlertCircle size={14} className="shrink-0" />
                                <span className="font-medium">Error al cargar</span>
                            </div>
                            <p className="text-xs text-red-500 mb-2">{error}</p>
                            <button
                                type="button"
                                onClick={load}
                                className="text-xs font-medium text-brand hover:underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!isLoading && !error && options.length === 0 && (
                        <div className="px-4 py-3.5 text-sm text-slate-400 text-center">
                            No hay opciones disponibles
                        </div>
                    )}

                    {/* Options */}
                    {!isLoading && !error && options.length > 0 && (
                        <ul className="py-1.5 max-h-60 overflow-y-auto">
                            {/* "All" option */}
                            <li>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={selectedId === null}
                                    onClick={() => handleSelect(null)}
                                    className={[
                                        'w-full text-left px-4 py-2 text-sm transition-colors',
                                        selectedId === null
                                            ? 'bg-brand/8 text-brand font-medium'
                                            : 'text-slate-700 hover:bg-slate-50',
                                    ].join(' ')}
                                >
                                    {allLabel}
                                </button>
                            </li>

                            <li aria-hidden className="my-1 border-t border-slate-100" />

                            {options.map((option) => (
                                <li key={option.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={option.id === selectedId}
                                        onClick={() => handleSelect(option.id)}
                                        className={[
                                            'w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2',
                                            option.id === selectedId
                                                ? 'bg-brand/8 text-brand font-medium'
                                                : 'text-slate-700 hover:bg-slate-50',
                                        ].join(' ')}
                                    >
                                        <span
                                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                                                option.id === selectedId
                                                    ? 'bg-brand'
                                                    : 'bg-slate-300'
                                            }`}
                                        />
                                        {option.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default SelectFilter;
