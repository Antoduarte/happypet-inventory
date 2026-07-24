import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react';

const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: LucideIcon }
> = {
    pending: {
        label: 'Pendiente',
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: Clock,
    },
    completed: {
        label: 'Completado',
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle2,
    },
    cancelled: {
        label: 'Cancelado',
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: XCircle,
    },
};

interface StatusBannerProps {
    status: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const Icon = config.icon ?? AlertTriangle;
    return (
        <div
            role="status"
            aria-label={`Estado: ${config.label}`}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border} ${config.text}`}
        >
            <Icon size={15} />
            <span className="text-sm font-semibold">{config.label}</span>
        </div>
    );
};
