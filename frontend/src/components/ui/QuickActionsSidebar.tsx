import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Types
export type QuickActionVariant = 'primary' | 'default' | 'danger' | 'warning' | 'success';

/**
 * Describes a single action item rendered inside the sidebar.
 * Render it with `hidden: true` to conditionally exclude an action.
 */
export interface QuickAction {
    /** Unique key used as the React list key */
    id: string;
    /** Label shown as the main text */
    label: string;
    /** Secondary descriptive text below the label */
    description?: string;
    /** Lucide icon component */
    icon: LucideIcon;
    /** Visual style of the action */
    variant?: QuickActionVariant;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Show a divider line above this action */
    dividerBefore?: boolean;
    /** Whether to hide this action entirely (useful for conditional actions) */
    hidden?: boolean;
    /** Whether the action is in progress (shows a spinner) */
    isLoading?: boolean;
    /** Click handler */
    onClick: () => void;
}

interface QuickActionsSidebarProps {
    /** Array of action items to render */
    actions: QuickAction[];
    /** Optional section title (defaults to "Acciones rápidas") */
    title?: string;
    /** Optional extra CSS classes for the `<aside>` element */
    className?: string;
}

// Style maps
const ICON_BG: Record<QuickActionVariant, string> = {
    primary: 'bg-brand/10 text-white',
    default: 'bg-gray-100 text-gray-600',
    danger: 'bg-red-50 text-red-500',
    warning: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-emerald-600',
};

const BTN_CLASS: Record<QuickActionVariant, string> = {
    primary:
        'bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed',
    default: 'text-slate-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed',
    danger: 'text-red-600 hover:bg-red-50',
    warning: 'text-amber-600 hover:bg-amber-50',
    success: 'text-emerald-600 hover:bg-emerald-50',
};

const DESCRIPTION_CLASS: Record<QuickActionVariant, string> = {
    primary: 'text-slate-200',
    default: 'text-slate-400',
    danger: 'text-red-400',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
};

// Spinner

const Spinner: React.FC = () => (
    <svg
        className="animate-spin h-4 w-4 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
    </svg>
);

/**
 * QuickActionsSidebar
 *
 * A reusable sidebar panel for fast contextual actions on any form page.
 * Each action is described via a plain `QuickAction` object, making it trivial
 * to add, remove, or reorder items without touching the markup.
 *
 * @example
 * ```tsx
 * <QuickActionsSidebar
 *   actions={[
 *     {
 *       id: 'save',
 *       label: 'Guardar cambios',
 *       description: 'Guardar cambios en el producto',
 *       icon: Save,
 *       variant: 'primary',
 *       onClick: handleSubmit(onSubmit),
 *     },
 *     {
 *       id: 'delete',
 *       label: 'Eliminar producto',
 *       description: 'Esta acción es irreversible',
 *       icon: Trash2,
 *       variant: 'danger',
 *       dividerBefore: true,
 *       hidden: !isEditing,
 *       onClick: () => setShowConfirm(true),
 *     },
 *   ]}
 * />
 * ```
 */
export const QuickActionsSidebar: React.FC<QuickActionsSidebarProps> = ({
    actions,
    title = 'Acciones rápidas',
    className = '',
}) => {
    const visibleActions = actions.filter((a) => !a.hidden);

    return (
        <aside className={`w-80 shrink-0 flex flex-col gap-2 ${className}`}>
            <Card>
                <div className="flex flex-col gap-2">
                    {/* Header */}
                    <p className="text-md font-semibold text-slate-700 mb-1">{title}</p>

                    {visibleActions.map((action) => {
                        const variant = action.variant ?? 'default';
                        const Icon = action.icon;

                        return (
                            <React.Fragment key={action.id}>
                                {action.dividerBefore && (
                                    <div className="my-1 border-t border-slate-200" aria-hidden />
                                )}
                                <button
                                    type="button"
                                    onClick={action.onClick}
                                    disabled={action.disabled || action.isLoading}
                                    aria-label={action.label}
                                    className={[
                                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg',
                                        'text-sm transition-colors text-left',
                                        BTN_CLASS[variant],
                                    ].join(' ')}
                                >
                                    {/* Icon badge */}
                                    <span
                                        className={`shrink-0 p-1.5 rounded-md ${ICON_BG[variant]}`}
                                    >
                                        {action.isLoading ? (
                                            <Spinner />
                                        ) : (
                                            <Icon size={18} aria-hidden />
                                        )}
                                    </span>

                                    {/* Text */}
                                    <div>
                                        <p className="font-medium leading-tight">{action.label}</p>
                                        {action.description && (
                                            <p className={`text-xs ${DESCRIPTION_CLASS[variant]}`}>
                                                {action.description}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            </Card>
        </aside>
    );
};

export default QuickActionsSidebar;
