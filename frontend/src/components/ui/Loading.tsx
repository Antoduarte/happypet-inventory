import React from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';

export const Loading: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            <ProgressSpinner
                aria-label="Cargando producto..."
                style={{ width: '50px', height: '50px' }}
                strokeWidth="4"
                animationDuration=".8s"
            />
        </div>
    );
};

export default Loading;
