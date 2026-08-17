import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface MetricCardProps {
    label: string;
    value: string;
    sublabel?: string;
    icon: LucideIcon;
    iconBg?: string;
    iconColor?: string;
    isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    sublabel,
    icon: Icon,
    iconBg = 'bg-brand/10',
    iconColor = 'text-brand',
    isLoading,
}) => (
    <Card>
        <div className="flex items-center gap-4">
            <span
                className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} ${iconColor}`}
            >
                <Icon size={24} />
            </span>
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                {isLoading ? (
                    <div className="h-7 w-24 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                    <>
                        <p className="text-2xl font-bold text-slate-800">{value}</p>
                        {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
                    </>
                )}
            </div>
        </div>
    </Card>
);

export default MetricCard;
