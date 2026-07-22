import React, { useRef, useState } from 'react';
import {
    Bell,
    Search,
    User,
    ChevronDown,
    UserCircle,
    Settings,
    LogOut,
    ChevronUp,
} from 'lucide-react';
import { Menu } from 'primereact/menu';
import type { MenuItem as MenuPrimeItem } from 'primereact/menuitem';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { MenuItem } from '../ui/MenuItem';

export const Topbar: React.FC = () => {
    const menuRef = useRef<Menu>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const goToSettings = () => navigate('/settings');
    const goToProfile = () => navigate('/profile');

    const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>) => menuRef.current?.toggle(e);
    const handleCloseMenu = () => setIsMenuOpen(false);
    const handleOpenMenu = () => setIsMenuOpen(true);

    const iconSize = 22;

    const userMenuItems: MenuPrimeItem[] = [
        {
            template: () => (
                <MenuItem
                    label="Perfil"
                    icon={<UserCircle size={iconSize} className="shrink-0" />}
                    onClick={goToProfile}
                    className={`text-slate-700 hover:bg-slate-50`}
                />
            ),
        },
        {
            template: () => (
                <MenuItem
                    label="Configuración"
                    icon={<Settings size={iconSize} className="shrink-0" />}
                    onClick={goToSettings}
                    className={`text-slate-700 hover:bg-slate-50`}
                />
            ),
        },
        {
            separator: true,
        },
        {
            template: () => (
                <MenuItem
                    label="Cerrar sesión"
                    icon={<LogOut size={iconSize} className="shrink-0" />}
                    onClick={handleLogout}
                    className={`text-red-500 hover:bg-red-50`}
                />
            ),
        },
    ];

    return (
        <>
            <Menu
                ref={menuRef}
                model={userMenuItems}
                popup
                onShow={handleOpenMenu}
                onHide={handleCloseMenu}
                pt={{
                    root: {
                        className:
                            'shadow-lg border border-slate-200 bg-white rounded-lg overflow-hidden py-1.5 min-w-[220px]',
                    },
                    menuitem: { className: 'list-none' },
                    separator: { className: 'border-t border-slate-100 my-1' },
                }}
            />
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center flex-1">
                    <div className="relative w-full max-w-md hidden md:block">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-light transition-all"
                        />
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100">
                        <Bell size={iconSize} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                    <button
                        id="user-menu-btn"
                        onClick={handleToggleMenu}
                        className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                        aria-haspopup
                        aria-controls="user-menu"
                    >
                        <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                            <User size={iconSize} />
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-slate-700 leading-tight">
                                Usuario Administrador
                            </p>
                            <p className="text-xs text-slate-500">Administrador</p>
                        </div>
                        {isMenuOpen ? (
                            <ChevronUp
                                size={iconSize}
                                className="hidden md:block text-slate-400 ml-1"
                            />
                        ) : (
                            <ChevronDown
                                size={iconSize}
                                className="hidden md:block text-slate-400 ml-1"
                            />
                        )}
                    </button>
                </div>
            </header>
        </>
    );
};
