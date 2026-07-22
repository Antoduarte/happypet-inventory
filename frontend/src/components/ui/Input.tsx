import React, { useState, type InputHTMLAttributes, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', id, type, ...props }, ref) => {
        const defaultId = React.useId();
        const inputId = id || defaultId;
        const isPassword = type === 'password';
        const [showPassword, setShowPassword] = useState(false);

        const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className={`flex flex-col gap-1.5 ${className}`}>
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        type={resolvedType}
                        className={`
              w-full px-4 py-2 bg-white border rounded-lg text-sm transition-all outline-none
              placeholder:text-slate-400
              ${isPassword ? 'pr-10' : ''}
              ${
                  error
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-300 focus:border-brand-light focus:ring-4 focus:ring-brand-light/10 hover:border-slate-400'
              }
              ${props.disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' : ''}
            `}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>
                {(error || helperText) && (
                    <p className={`text-xs mt-0.5 ${error ? 'text-red-500' : 'text-slate-500'}`}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    },
);
Input.displayName = 'Input';
