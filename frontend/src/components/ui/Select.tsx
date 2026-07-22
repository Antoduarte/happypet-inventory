import React from 'react';
import { Controller, type Control } from 'react-hook-form';

interface SelectProps {
    name: string;
    control: Control<any>;
    options: { value: string | number; label: string }[];
    label: string;
    error?: string;
    isLoading?: boolean;
    noOptionsText?: string;
    className?: string;
    required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    name,
    control,
    options,
    label,
    error,
    isLoading,
    noOptionsText,
    className,
}) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <select
                        {...field}
                        value={field.value ?? ''}
                        className="form-select w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light/10 transition-all outline-none"
                    >
                        <option value="" disabled>
                            {isLoading ? 'Cargando...' : noOptionsText}
                        </option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                )}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
    );
};

export default Select;
