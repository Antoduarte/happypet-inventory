import React from 'react';
import { Calendar } from 'primereact/calendar';
import '@/utils/primeLocale';
import { toISODate } from '@/utils/dateRange';

/** Parses 'YYYY-MM-DD' as a local date (avoids the UTC day shift of `new Date(str)`). */
const parseISODate = (value?: string | null): Date | null => {
    if (!value) return null;
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

interface DateInputProps {
    /** ISO date string (YYYY-MM-DD) or empty. */
    value?: string | null;
    onChange: (value: string) => void;
    onBlur?: () => void;
    label?: string;
    optionalHint?: boolean;
    required?: boolean;
    error?: string;
    /** ISO date strings. */
    minDate?: string;
    maxDate?: string;
    placeholder?: string;
    id?: string;
    name?: string;
    className?: string;
    /** Compact styling for filter bars. */
    compact?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
    value,
    onChange,
    onBlur,
    label,
    optionalHint,
    required,
    error,
    minDate,
    maxDate,
    placeholder = 'dd/mm/aaaa',
    id,
    name,
    className = '',
    compact = false,
}) => {
    const defaultId = React.useId();
    const inputId = id || defaultId;

    const inputClass = compact
        ? 'w-full rounded-lg border border-slate-300 hover:border-slate-400 bg-white px-3 py-2 text-sm text-slate-700 shadow-none transition-all outline-none focus:border-brand-light focus:ring-1 focus:ring-brand-light/10'
        : `w-full px-4 py-2 bg-white border rounded-lg text-sm shadow-none transition-all outline-none ${
              error
                  ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/10'
                  : 'border-slate-300 hover:border-slate-400 focus:border-brand-light focus:ring-1 focus:ring-brand-light/10'
          }`;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className={
                        compact
                            ? 'text-xs font-medium text-slate-500'
                            : 'text-sm font-medium text-slate-700'
                    }
                >
                    {label}
                    {optionalHint && (
                        <span className="text-slate-400 font-normal"> (opcional)</span>
                    )}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <Calendar
                inputId={inputId}
                name={name}
                value={parseISODate(value)}
                onChange={(e) => {
                    const d = e.value as Date | null | undefined;
                    onChange(d ? toISODate(d) : '');
                }}
                onBlur={onBlur}
                minDate={parseISODate(minDate) ?? undefined}
                maxDate={parseISODate(maxDate) ?? undefined}
                locale="es"
                dateFormat="dd/mm/yy"
                placeholder={placeholder}
                showIcon={!compact}
                showButtonBar
                readOnlyInput={false}
                inputClassName={inputClass}
                className="app-datepicker w-full"
                panelClassName="app-datepicker-panel"
                appendTo={typeof document !== 'undefined' ? document.body : undefined}
            />
            {error && <p className="text-xs mt-0.5 text-red-500">{error}</p>}
        </div>
    );
};

export default DateInput;
