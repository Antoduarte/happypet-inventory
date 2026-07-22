import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface FormSectionProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * FormSection
 *
 * Provides a consistent labeled group header with an optional icon
 * to separate and name logical sections within a form Card.
 *
 * Usage:
 * ```tsx
 * <FormSection title="Información básica" icon={Info} iconBg="bg-brand/10" iconColor="text-brand">
 *   <Input ... />
 * </FormSection>
 * ```
 */
export const FormSection: React.FC<FormSectionProps> = ({
    title,
    description,
    icon: Icon,
    iconColor = 'text-brand',
    iconBg = 'bg-brand/10',
    children,
    className = '',
}) => {
    return (
        <div className={`space-y-4 ${className}`}>
            {/* Section header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                {Icon && (
                    <span
                        className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg ${iconBg} ${iconColor}`}
                        aria-hidden="true"
                    >
                        <Icon size={14} />
                    </span>
                )}
                <div>
                    <p className="text-sm font-semibold text-slate-700 leading-tight">{title}</p>
                    {description && (
                        <p className="text-xs text-slate-400 leading-tight mt-0.5">{description}</p>
                    )}
                </div>
            </div>

            {/* Section fields */}
            <div className="space-y-4">{children}</div>
        </div>
    );
};

export default FormSection;
