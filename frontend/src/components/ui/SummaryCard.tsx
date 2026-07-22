import React from 'react';
import { Card } from './Card';

interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.FC<{ size?: number; className?: string }>;
    bgClass: string;
    iconClass: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
    title,
    value,
    icon: Icon,
    bgClass,
    iconClass,
}) => (
    <Card className="flex items-center gap-4">
        <span
            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl ${bgClass}`}
        >
            <Icon size={20} className={iconClass} />
        </span>
        <div>
            <p className="text-xs font-medium text-slate-400">{title}</p>
            <p className="text-lg font-bold text-slate-800">{value}</p>
        </div>
    </Card>
);
