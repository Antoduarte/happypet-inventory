import React from 'react';
import { AlertTriangle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: {
        label: 'Pendiente',
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
    },
    completed: {
        label: 'Completado',
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
    },
    cancelled: {
        label: 'Cancelado',
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
    },
};

interface StatusBannerProps {
    status: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <div
            role="status"
            aria-label={`Estado: ${config.label}`}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border} ${config.text}`}
        >
            <AlertTriangle size={15} />
            <span className="text-sm font-semibold">{config.label}</span>
        </div>
    );
};
