import { Link, useLocation } from 'react-router-dom';
import petLogo from '../../assets/pet-logo.webp';
import {
    Home,
    Package,
    Tags,
    ArrowRightLeft,
    ShoppingCart,
    Wrench,
    Users,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    BarChart3,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user, cashSessionId, cashSessionStatus } = useAuth();

    const getCashSessionPath = () => {
        if (cashSessionStatus === 'suspended' && cashSessionId) {
            return `/cash/resume/${cashSessionId}`;
        }
        if (cashSessionStatus === 'open' && cashSessionId) {
            return `/cash-session/${cashSessionId}`;
        }
        return '/cash/open';
    };

    const menuItems = [
        { path: '/', icon: Home, label: 'Panel' },
        { path: '/products', icon: Package, label: 'Productos', show: true },
        { path: '/categories', icon: Tags, label: 'Categorías', show: true },
        { path: '/movements', icon: ArrowRightLeft, label: 'Movimientos', show: true },
        { path: '/sales', icon: ShoppingCart, label: 'Ventas', show: true },
        { path: '/reports', icon: BarChart3, label: 'Reportes', show: true },
        { path: '/services', icon: Wrench, label: 'Servicios', show: true },
        {
            path: getCashSessionPath(),
            icon: CircleDollarSign,
            label: 'Caja',
            show: true,
        },
        { path: '/users', icon: Users, label: 'Usuarios', show: user?.role === 'admin' },
    ];

    const visibleItems = menuItems.filter((item) => item.show !== false);

    return (
        <aside
            className={`bg-white text-slate-600 transition-all duration-300 flex flex-col h-screen sticky top-0
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
        >
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <img src={petLogo} alt="HappyPet" className="h-12 w-auto" />
                        <span className="text-brand text-xl font-bold">HappyPet</span>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 ${isCollapsed ? 'mx-auto' : ''}`}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${
                    isActive
                        ? 'bg-brand/10 text-brand-light'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon
                                size={22}
                                className={`transition-colors duration-200 ${isActive ? 'text-brand-light' : 'group-hover:text-slate-700'}`}
                            />
                            {!isCollapsed && (
                                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
};
