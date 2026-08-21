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
    ChevronDown,
    CircleDollarSign,
    Wallet,
    History,
    List,
    type LucideIcon,
    BarChart3,
    ChartNoAxesColumn,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarItem {
    path?: string;
    label: string;
    icon?: LucideIcon;
    show?: boolean;
    children?: SidebarItem[];
}

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const { user, cashSessionId, cashSessionStatus } = useAuth();

    const canViewAccountingReports =
        user?.role === 'admin' || user?.role === 'manager' || user?.role === 'accountant';
    const isSeller = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'cashier';

    const getCashSessionPath = () => {
        if (cashSessionStatus === 'suspended' && cashSessionId) {
            return `/cash/resume/${cashSessionId}`;
        }
        if (cashSessionStatus === 'open' && cashSessionId) {
            return `/cash-session/${cashSessionId}`;
        }
        return '/cash/open';
    };

    const menuGroups: SidebarItem[] = [
        { path: '/', icon: Home, label: 'Panel', show: isSeller },
        { path: '/products', icon: Package, label: 'Productos', show: isSeller },
        { path: '/categories', icon: Tags, label: 'Categorías', show: isSeller },
        {
            path: '/movements',
            icon: ArrowRightLeft,
            label: 'Movimientos',
            show: isSeller,
        },
        {
            label: 'Ventas',
            icon: List,
            children: [
                { path: '/sales', icon: ShoppingCart, label: 'Ventas', show: isSeller },
                { path: '/reports/sales', icon: BarChart3, label: 'Reportes', show: true },
            ],
        },
        { path: '/services', icon: Wrench, label: 'Servicios', show: isSeller },
        {
            label: 'Caja',
            icon: List,
            children: [
                {
                    path: getCashSessionPath(),
                    icon: CircleDollarSign,
                    label: 'Caja',
                    show: isSeller,
                },
                {
                    path: '/reports/cash',
                    icon: ChartNoAxesColumn,
                    label: 'Reporte de Caja',
                    show: canViewAccountingReports,
                },
                {
                    path: '/closed-cash-sessions',
                    icon: History,
                    label: 'Historial de Cajas',
                    show: canViewAccountingReports,
                },
            ],
        },
        {
            path: '/general-movements',
            icon: Wallet,
            label: 'Ingresos y Egresos',
            show: canViewAccountingReports,
        },
        { path: '/users', icon: Users, label: 'Usuarios', show: user?.role === 'admin' },
    ];

    const isPathActive = (path?: string) =>
        path !== undefined &&
        (location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));

    const isGroupVisible = (group: SidebarItem) =>
        group.children
            ? group.children.some((child) => child.show !== false)
            : group.show !== false;

    const isGroupActive = (group: SidebarItem) =>
        group.children?.some((child) => isPathActive(child.path)) ?? false;

    const isGroupExpanded = (group: SidebarItem) => {
        const override = expandedGroups[group.label];
        if (override !== undefined) return override;
        return isGroupActive(group);
    };

    const getFlatItems = () => {
        const flat: SidebarItem[] = [];
        for (const group of menuGroups) {
            if (isGroupVisible(group)) {
                if (group.children) {
                    flat.push(...group.children.filter((child) => child.show !== false));
                } else {
                    flat.push(group);
                }
            }
        }
        return flat;
    };

    const renderItem = (item: SidebarItem, isChild = false) => {
        const Icon = item.icon;
        const isActive = isPathActive(item.path);

        return (
            <Link
                key={item.label}
                to={item.path!}
                className={`
                    flex items-center gap-3 rounded-xl transition-all duration-200 group
                    ${isChild ? 'px-3 py-2 pl-6' : 'px-3 py-3'}
                    ${
                        isActive
                            ? 'bg-brand/10 text-brand-light'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
            >
                {Icon && (
                    <Icon
                        size={isChild ? 18 : 22}
                        className={`transition-colors duration-200 flex-shrink-0 ${isActive ? 'text-brand-light' : 'group-hover:text-slate-700'}`}
                    />
                )}
                {!isCollapsed && (
                    <span className={`font-medium truncate ${isActive ? 'font-semibold' : ''}`}>
                        {item.label}
                    </span>
                )}
            </Link>
        );
    };

    const toggleGroup = (label: string) => {
        setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
    };

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
                {isCollapsed
                    ? getFlatItems().map((item) => renderItem(item))
                    : menuGroups.filter(isGroupVisible).map((group) =>
                          group.children ? (
                              <React.Fragment key={group.label}>
                                  <button
                                      onClick={() => toggleGroup(group.label)}
                                      className={`
                                              flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group w-full text-left
                                              ${
                                                  isGroupActive(group)
                                                      ? 'bg-brand/10 text-brand-light'
                                                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                              }
                                          `}
                                  >
                                      {group.icon && (
                                          <group.icon
                                              size={22}
                                              className={`transition-colors duration-200 flex-shrink-0 ${
                                                  isGroupActive(group)
                                                      ? 'text-brand-light'
                                                      : 'group-hover:text-slate-700'
                                              }`}
                                          />
                                      )}
                                      <span
                                          className={`font-medium flex-1 truncate ${isGroupActive(group) ? 'font-semibold' : ''}`}
                                      >
                                          {group.label}
                                      </span>
                                      <ChevronDown
                                          size={16}
                                          className={`transition-transform duration-200 ${
                                              isGroupExpanded(group) ? 'rotate-180' : ''
                                          } text-slate-400`}
                                      />
                                  </button>
                                  {isGroupExpanded(group) && (
                                      <div className="flex flex-col gap-1">
                                          {group.children
                                              .filter((child) => child.show !== false)
                                              .map((child) => renderItem(child, true))}
                                      </div>
                                  )}
                              </React.Fragment>
                          ) : (
                              renderItem(group)
                          ),
                      )}
            </nav>
        </aside>
    );
};
