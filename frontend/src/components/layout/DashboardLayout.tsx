import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const DashboardLayout: React.FC = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand/5 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
