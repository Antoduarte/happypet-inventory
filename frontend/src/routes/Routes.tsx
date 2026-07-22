import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '../pages/Auth/Login';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { CategoryList } from '../pages/Category/CategoryList';
import { CategoryFormPage } from '../pages/Category/CategoryFormPage';
import { ProductList } from '../pages/Product/ProductList';
import { ProductFormPage } from '../pages/Product/ProductFormPage';
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
import { PrivateRoute } from '../components/auth/PrivateRoute';
// import { RoleGuard } from '../components/auth/RoleGuard';
import { OpenSessionPage } from '../pages/CashSession/OpenSessionPage';
import { ResumeSessionPage } from '../pages/CashSession/ResumeSessionPage';
import { CurrentSessionPage } from '../pages/CashSession/CurrentSessionPage';
// import { SessionReportPage } from '../pages/CashSession/SessionReportPage';
import { RoleGuard } from '@/components/auth/RoleGuard';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Public standalone routes */}
            <Route path="/cash/open" element={<OpenSessionPage />} />
            <Route path="/cash/resume/:sessionId" element={<ResumeSessionPage />} />

            {/* All dashboard routes require authentication */}
            <Route element={<PrivateRoute />}>
                <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="categories" element={<CategoryList />} />
                    <Route path="categories/new" element={<CategoryFormPage />} />
                    <Route path="categories/edit/:id" element={<CategoryFormPage />} />

                    <Route path="products" element={<ProductList />} />
                    <Route path="products/new" element={<ProductFormPage />} />
                    <Route path="products/edit/:id" element={<ProductFormPage />} />

                    <Route path="movements" element={<MovementList />} />
                    <Route path="movements/new" element={<MovementFormPage />} />
                    <Route path="movements/edit/:id" element={<MovementFormPage />} />

                    <Route path="reports" element={<ReportsPage />} />

                    <Route path="sales" element={<SalesList />} />
                    <Route path="sales/:id" element={<SaleDetailPage />} />
                    <Route path="sales/new" element={<SaleFormPage />} />
                    <Route path="sales/:id/print" element={<SaleTicketPrintPage />} />

                    <Route path="services" element={<ServiceList />} />
                    <Route path="services/new" element={<ServiceFormPage />} />
                    <Route path="services/edit/:id" element={<ServiceFormPage />} />

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

                    <Route path="cash-session/:sessionId" element={<CurrentSessionPage />} />
                    {/* <Route path="cash-session/:sessionId/report" element={<SessionReportPage />} /> */}

                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Route>
            </Route>
        </Routes>
    );
};
