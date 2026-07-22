import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
    title: string;
    breadcrumbs?: Array<{ label: string; path?: string }>;
    action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs, action }) => {
    return (
        <div className="flex flex-col sm:flex-row bg-white px-5 py-3 rounded-xl shadow-sm justify-between items-start sm:items-center gap-4 mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="flex items-center text-sm text-slate-500 mt-2 font-medium">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && (
                                    <ChevronRight size={14} className="mx-2 text-slate-400" />
                                )}
                                {crumb.path ? (
                                    <Link
                                        to={crumb.path}
                                        className="hover:text-brand-light transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-slate-700">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
};
