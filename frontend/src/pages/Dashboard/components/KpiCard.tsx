import React from 'react';
import { Link } from 'react-router-dom';

type Accent = 'brand' | 'amber' | 'emerald' | 'slate';

const ACCENTS: Record<Accent, string> = {
    brand: 'bg-brand/10 text-brand',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-500',
};

interface KpiCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    accent?: Accent;
    subtitle?: string;
    /** When set, the whole card becomes a link to this route. */
    to?: string;
    isLoading?: boolean;
    /** Amber alert treatment (e.g. low-stock with items pending). */
    highlight?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
    title,
    value,
    icon: Icon,
    accent = 'brand',
    subtitle,
    to,
    isLoading,
    highlight,
}) => {
    const body = (
        <div
            className={`h-full rounded-2xl border p-5 shadow-sm transition-all ${
                highlight
                    ? 'border-amber-200 bg-gradient-to-b from-white to-amber-50/60'
                    : 'border-slate-200 bg-white'
            } ${to ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-brand-muted' : ''}`}
        >
            <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${ACCENTS[accent]}`}
            >
                <Icon size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
            {isLoading ? (
                <div className="mt-1.5 h-7 w-24 animate-pulse rounded bg-slate-200" />
            ) : (
                <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
                    {value}
                </p>
            )}
            {subtitle && (
                <p
                    className={`mt-1.5 text-xs ${
                        to
                            ? 'font-semibold text-brand-light'
                            : highlight
                              ? 'font-medium text-amber-700'
                              : 'text-slate-400'
                    }`}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );

    return to ? (
        <Link to={to} className="block h-full">
            {body}
        </Link>
    ) : (
        body
    );
};
