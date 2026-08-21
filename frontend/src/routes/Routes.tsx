import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '../pages/Auth/Login';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { CategoryList } from '../pages/Category/CategoryList';
import { CategoryFormPage } from '../pages/Category/CategoryFormPage';
import { ProductList } from '../pages/Product/ProductList';
import { ProductFormPage } from '../pages/Product/ProductFormPage';
import { PresentationFormPage } from '../pages/Product/PresentationFormPage';
import { MovementList } from '../pages/InventoryMovement/MovementList';
import { MovementFormPage } from '../pages/InventoryMovement/MovementFormPage';
import { SalesList } from '../pages/Sales/SalesList';
import { SaleFormPage } from '../pages/Sales/SaleFormPage';
import { SaleDetailPage } from '../pages/Sales/SaleDetailPage';
import { SaleTicketPrintPage } from '../pages/Sales/SaleTicketPrintPage';
import { ServiceList } from '../pages/Service/ServiceList';
import { ServiceFormPage } from '../pages/Service/ServiceFormPage';
import { UserList } from '../pages/User/UserList';
import { UserFormPage } from '../pages/User/UserFormPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { CashReportPage } from '../pages/CashReport/CashReportPage';
import { PrivateRoute } from '../components/auth/PrivateRoute';
import { OpenSessionPage } from '../pages/CashSession/OpenSessionPage';
import { ResumeSessionPage } from '../pages/CashSession/ResumeSessionPage';
import { CurrentSessionPage } from '../pages/CashSession/CurrentSessionPage';
import { GeneralMovementList } from '../pages/GeneralMovement/GeneralMovementList';
import { GeneralMovementFormPage } from '../pages/GeneralMovement/GeneralMovementFormPage';
import { ClosedCashSessionListPage } from '../pages/ClosedCashSession/ClosedCashSessionListPage';
import { ClosedCashSessionDetailPage } from '../pages/ClosedCashSession/ClosedCashSessionDetailPage';
import { RoleGuard } from '@/components/auth/RoleGuard';
import type { UserRole } from '@/interfaces/auth';

export const AppRoutes = () => {
    const sellerRoles: UserRole[] = ['admin', 'manager', 'cashier'];
    const accountingRoles: UserRole[] = ['admin', 'manager', 'accountant'];

    return (
        <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Standalone routes (sellers only) */}
            <Route
                path="/cash/open"
                element={
                    <RoleGuard roles={sellerRoles}>
                        <OpenSessionPage />
                    </RoleGuard>
                }
            />
            <Route
                path="/cash/resume/:sessionId"
                element={
                    <RoleGuard roles={sellerRoles}>
                        <ResumeSessionPage />
                    </RoleGuard>
                }
            />

            {/* All dashboard routes require authentication */}
            <Route element={<PrivateRoute />}>
                <Route path="/" element={<DashboardLayout />}>
                    <Route
                        index
                        element={
                            <RoleGuard roles={sellerRoles} fallback="/reports/cash">
                                <Dashboard />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="categories"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <CategoryList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="categories/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <CategoryFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="categories/edit/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <CategoryFormPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="products"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <ProductList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="products/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <ProductFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="products/edit/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <ProductFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="products/:productId/presentations/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <PresentationFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="products/:productId/presentations/edit/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <PresentationFormPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="movements"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <MovementList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="movements/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <MovementFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="movements/edit/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <MovementFormPage />
                            </RoleGuard>
                        }
                    />

                    <Route path="reports/sales" element={<ReportsPage />} />
                    <Route
                        path="reports/cash"
                        element={
                            <RoleGuard roles={accountingRoles}>
                                <CashReportPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="sales"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <SalesList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="sales/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <SaleDetailPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="sales/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <SaleFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="sales/:id/print"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <SaleTicketPrintPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="general-movements"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <GeneralMovementList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="general-movements/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <GeneralMovementFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="general-movements/edit/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <GeneralMovementFormPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="services"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <ServiceList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="services/new"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <ServiceFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="services/edit/:id"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <ServiceFormPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="users"
                        element={
                            <RoleGuard roles={['admin']}>
                                <UserList />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="users/new"
                        element={
                            <RoleGuard roles={['admin']}>
                                <UserFormPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="users/edit/:id"
                        element={
                            <RoleGuard roles={['admin']}>
                                <UserFormPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="cash-session/:sessionId"
                        element={
                            <RoleGuard roles={sellerRoles}>
                                <CurrentSessionPage />
                            </RoleGuard>
                        }
                    />

                    <Route
                        path="closed-cash-sessions"
                        element={
                            <RoleGuard roles={accountingRoles}>
                                <ClosedCashSessionListPage />
                            </RoleGuard>
                        }
                    />
                    <Route
                        path="closed-cash-sessions/:id"
                        element={
                            <RoleGuard roles={accountingRoles}>
                                <ClosedCashSessionDetailPage />
                            </RoleGuard>
                        }
                    />

                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Route>
            </Route>
        </Routes>
    );
};
