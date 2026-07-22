/**
 * PresentationsPanel
 *
 * Panel embebido en ProductFormPage que muestra la lista de presentaciones
 * del producto y permite navegar a su formulario de creación/edición.
 *
 * Aparece solo cuando el producto ya existe (modo edición).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Layers, Barcode, CheckCircle2, XCircle } from 'lucide-react';
import type { ProductPresentation } from '../../interfaces/product';
import { BASE_UNIT_LABELS } from '../../schemas/product';

interface PresentationsPanelProps {
    productId: number;
    baseUnit: string;
    presentations: ProductPresentation[];
}

export const PresentationsPanel: React.FC<PresentationsPanelProps> = ({
    productId,
    baseUnit,
    presentations,
}) => {
    const navigate = useNavigate();

    const goToNew = () => navigate(`/products/${productId}/presentations/new`);
    const goToEdit = (presId: number) =>
        navigate(`/products/${productId}/presentations/edit/${presId}`);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-700">
                        {presentations.length > 0
                            ? `${presentations.length} presentación${presentations.length !== 1 ? 'es' : ''}`
                            : 'Sin presentaciones'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Unidad base:{' '}
                        <span className="font-medium text-slate-600">
                            {BASE_UNIT_LABELS[baseUnit] || baseUnit}
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={goToNew}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Plus size={14} />
                    Nueva
                </button>
            </div>

            {/* Empty state */}
            {presentations.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60">
                    <span className="p-3 bg-slate-100 rounded-xl mb-3">
                        <Layers size={22} className="text-slate-400" />
                    </span>
                    <p className="text-sm font-medium text-slate-500">Sin presentaciones</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4 max-w-[220px] leading-relaxed">
                        Agrega presentaciones para vender este producto en distintos formatos (saco,
                        libra, caja, etc.)
                    </p>
                    <button
                        type="button"
                        onClick={goToNew}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={14} />
                        Agregar presentación
                    </button>
                </div>
            )}

            {/* Presentation cards */}
            {presentations.length > 0 && (
                <div className="space-y-2">
                    {presentations.map((p) => (
                        <div
                            key={p.id}
                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-brand/30 hover:shadow-sm transition-all group"
                        >
                            {/* Icon */}
                            <span className="shrink-0 p-2 rounded-lg bg-brand/8 text-brand">
                                <Layers size={15} />
                            </span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-700 truncate">
                                        {p.name}
                                    </p>
                                    {p.is_active ? (
                                        <CheckCircle2
                                            size={13}
                                            className="text-emerald-500 shrink-0"
                                        />
                                    ) : (
                                        <XCircle size={13} className="text-slate-400 shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    <span className="text-[11px] text-slate-500">
                                        ×{p.multiplier} {baseUnit}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-700">
                                        ${parseFloat(p.price).toFixed(2)}
                                    </span>
                                    {p.barcode && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                            <Barcode size={10} />
                                            {p.barcode}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Edit button */}
                            <button
                                type="button"
                                onClick={() => goToEdit(p.id)}
                                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar presentación"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
