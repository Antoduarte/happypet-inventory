import type { LucideIcon } from 'lucide-react';

export interface TogglePillOption<T extends string | number = string> {
    value: T;
    label: string;
    icon?: LucideIcon;
    /** Optional color overrides for the active state */
    activeClass?: string;
}

interface TogglePillsProps<T extends string | number = string> {
    options: TogglePillOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label?: string;
    required?: boolean;
    error?: string;
    /** Visually sizes the pills. Defaults to 'md' */
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * TogglePills
 *
 * A pill-style toggle selector for small, discrete option sets (2–5 options).
 * Replaces plain <select> elements for status, type, and similar binary fields.
 *
 * Usage with react-hook-form Controller:
 * ```tsx
 * <Controller
 *   name="status"
 *   control={control}
 *   render={({ field }) => (
 *     <TogglePills
 *       label="Estado"
 *       required
 *       options={[
 *         { value: 'active', label: 'Activo' },
 *         { value: 'inactive', label: 'Inactivo' },
 *       ]}
 *       value={field.value}
 *       onChange={field.onChange}
 *       error={errors.status?.message}
 *     />
 *   )}
 * />
 * ```
 */
export function TogglePills<T extends string | number = string>({
    options,
    value,
    onChange,
    label,
    required,
    error,
    size = 'md',
    className = '',
}: TogglePillsProps<T>) {
    const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <p className="text-sm font-medium text-slate-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </p>
            )}
            <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
                {options.map((opt) => {
                    const isActive = opt.value === value;
                    const Icon = opt.icon;

                    const defaultActiveClass =
                        'border-brand bg-brand text-white shadow-sm shadow-brand/30';
                    const activeClass = opt.activeClass ?? defaultActiveClass;

                    return (
                        <button
                            key={String(opt.value)}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => onChange(opt.value)}
                            className={[
                                'inline-flex items-center gap-1.5 rounded-xl border-2 font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                                sizeClasses,
                                isActive
                                    ? activeClass
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            {Icon && <Icon size={size === 'sm' ? 12 : 14} aria-hidden />}
                            {opt.label}
                        </button>
                    );
                })}
            </div>
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}

export default TogglePills;
