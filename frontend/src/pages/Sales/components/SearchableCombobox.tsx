/**
 * SearchableCombobox
 *
 * Combobox de búsqueda reutilizable para seleccionar productos o servicios.
 *
 * Características:
 * - Input de texto con búsqueda por nombre parcial (case-insensitive)
 * - Dropdown flotante con lista filtrada de opciones
 * - Soporte para metadatos por opción (badge secundario: stock, precio…)
 * - Estados: vacío, sin resultados, cargando
 * - Teclado: Esc para cerrar, Enter/ArrowUp/ArrowDown para navegar
 * - Accesible: roles ARIA básicos
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComboboxOption {
    id: number;
    label: string; // texto principal (nombre del producto/servicio)
    badge?: string; // texto secundario (stock, precio…)
    badgeVariant?: 'neutral' | 'warning' | 'success' | 'error';
    disabled?: boolean; // si el ítem no puede seleccionarse (sin stock)
    meta?: string; // texto adicional pequeño (categoría, etc.)
}

interface SearchableComboboxProps {
    options: ComboboxOption[];
    value: number | null | undefined; // id seleccionado
    onChange: (id: number) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    /** Color de acento: indigo (productos) | violet (servicios) */
    accent?: 'indigo' | 'violet';
    /** Versión compacta para insumos en la lista de servicios */
    compact?: boolean;
    /** Deshabilita el control completamente */
    disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const BADGE_CLASSES: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-500',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100   text-red-600',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Buscar...',
    error,
    accent = 'indigo',
    compact = false,
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState<number>(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Derived ─────────────────────────────────────────────────────────────

    const selectedOption = options.find((o) => o.id === value);

    const filtered =
        query.trim().length === 0
            ? options
            : options.filter(
                  (o) =>
                      o.label.toLowerCase().includes(query.toLowerCase()) ||
                      (o.meta ?? '').toLowerCase().includes(query.toLowerCase()),
              );

    // ── Accent styles ────────────────────────────────────────────────────────

    const accentFocusRing =
        accent === 'violet'
            ? 'focus-within:border-violet-400 focus-within:ring-violet-300/20'
            : 'focus-within:border-indigo-400 focus-within:ring-indigo-300/20';

    const accentHighlight =
        accent === 'violet' ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-700';

    const accentSelected =
        accent === 'violet'
            ? 'border-violet-400 ring-1 ring-violet-300/20'
            : 'border-indigo-400 ring-1 ring-indigo-300/20';

    // ── Open / close dropdown ────────────────────────────────────────────────

    const openDropdown = () => {
        setQuery('');
        setHighlighted(-1);
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const closeDropdown = useCallback(() => {
        setOpen(false);
        setQuery('');
        setHighlighted(-1);
    }, []);

    // ── Click outside ────────────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [closeDropdown]);

    // ── Keyboard navigation ──────────────────────────────────────────────────

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const available = filtered.filter((o) => !o.disabled);
        if (!open) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                openDropdown();
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlighted((prev) => Math.min(prev + 1, available.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlighted((prev) => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlighted >= 0 && available[highlighted]) {
                    selectOption(available[highlighted]);
                }
                break;
            case 'Escape':
                closeDropdown();
                break;
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlighted >= 0 && listRef.current) {
            const item = listRef.current.children[highlighted] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    // ── Select handler ───────────────────────────────────────────────────────

    const selectOption = (opt: ComboboxOption) => {
        if (opt.disabled) return;
        onChange(opt.id);
        closeDropdown();
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(0);
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const inputH = compact ? 'h-[30px] py-1 text-xs' : 'h-[38px] py-2 text-sm';
    const triggerH = compact ? 'h-[30px] py-1 text-xs' : 'h-[38px] py-2 text-sm';

    return (
        <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
            {/* Trigger button (closed state) */}
            {!open && (
                <button
                    type="button"
                    onClick={!disabled ? openDropdown : undefined}
                    disabled={disabled}
                    className={`
                        w-full flex items-center gap-2 pl-3 pr-2 border rounded-lg
                        bg-white transition-all outline-none text-left
                        ${triggerH}
                        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        ${error ? 'border-red-300' : 'border-slate-300 hover:border-slate-400'}
                        ${selectedOption ? accentSelected : ''}
                    `}
                >
                    {selectedOption ? (
                        <>
                            <span className="flex-1 truncate font-medium text-slate-800">
                                {selectedOption.label}
                            </span>
                            {selectedOption.badge && (
                                <span
                                    className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_CLASSES[selectedOption.badgeVariant ?? 'neutral']}`}
                                >
                                    {selectedOption.badge}
                                </span>
                            )}
                            <X
                                size={12}
                                className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                                onClick={clearSelection}
                            />
                        </>
                    ) : (
                        <>
                            <Search
                                size={compact ? 11 : 13}
                                className="text-slate-400 flex-shrink-0"
                            />
                            <span className="flex-1 text-slate-400">{placeholder}</span>
                            <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
                        </>
                    )}
                </button>
            )}

            {/* Search input (open state) */}
            {open && (
                <div
                    className={`
                        w-full flex items-center gap-2 pl-3 pr-2 border rounded-lg
                        bg-white ring-1 transition-all
                        ${inputH}
                        ${accentFocusRing}
                        ${accent === 'violet' ? 'border-violet-400' : 'border-indigo-400'}
                    `}
                >
                    <Search size={compact ? 11 : 13} className="text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlighted(-1);
                        }}
                        placeholder="Escribe para filtrar…"
                        className="flex-1 outline-none bg-transparent text-slate-800 placeholder:text-slate-400 min-w-0"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            )}

            {/* Validation error */}
            {error && (
                <span className="flex items-center gap-1 mt-0.5 text-[11px] text-red-500">
                    <AlertCircle size={10} />
                    {error}
                </span>
            )}

            {/* Dropdown list */}
            {open && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {/* Search results header */}
                    {query && (
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                            {filtered.length > 0
                                ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                                : 'Sin resultados'}
                        </div>
                    )}

                    {/* Options */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-1 py-6 text-slate-400">
                            <Search size={18} className="opacity-40" />
                            <p className="text-xs">No se encontraron resultados</p>
                            {query && <p className="text-[10px] text-slate-300">para "{query}"</p>}
                        </div>
                    ) : (
                        <ul ref={listRef} role="listbox" className="max-h-52 overflow-y-auto py-1">
                            {filtered.map((opt) => {
                                const availableIndex = filtered
                                    .filter((o) => !o.disabled)
                                    .indexOf(opt);
                                const isHighlighted =
                                    !opt.disabled && availableIndex === highlighted;
                                const isSelected = opt.id === value;

                                return (
                                    <li
                                        key={opt.id}
                                        role="option"
                                        aria-selected={isSelected}
                                        aria-disabled={opt.disabled}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectOption(opt);
                                        }}
                                        onMouseEnter={() =>
                                            !opt.disabled && setHighlighted(availableIndex)
                                        }
                                        className={`
                                            flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                                            ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                            ${isHighlighted ? accentHighlight : isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'}
                                        `}
                                    >
                                        {/* Check mark for selected */}
                                        <span
                                            className={`w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 transition-all ${
                                                isSelected
                                                    ? accent === 'violet'
                                                        ? 'border-violet-500 bg-violet-500'
                                                        : 'border-indigo-500 bg-indigo-500'
                                                    : 'border-slate-200'
                                            }`}
                                        />

                                        {/* Main label + meta */}
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium text-slate-800 truncate">
                                                <HighlightMatch text={opt.label} query={query} />
                                            </span>
                                            {opt.meta && (
                                                <span className="block text-[10px] text-slate-400 truncate">
                                                    {opt.meta}
                                                </span>
                                            )}
                                        </span>

                                        {/* Badge */}
                                        {opt.badge && (
                                            <span
                                                className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_CLASSES[opt.badgeVariant ?? 'neutral']}`}
                                            >
                                                {opt.badge}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* Options count footer */}
                    {!query && filtered.length > 6 && (
                        <div className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 bg-slate-50 text-center">
                            {filtered.length} opciones — escribe para filtrar
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-component: highlight matching text
// ---------------------------------------------------------------------------

const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
};
