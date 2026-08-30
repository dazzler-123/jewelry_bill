import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Theme & Global Context Providers
import theme from './theme';
import { SnackbarProvider } from './context/SnackbarContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Layout & Shell
import AppShell from './components/Layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './components/NotFoundPage';

// Feature Pages
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import BillingPage from './features/billing/BillingPage';
import BillsPage from './features/bills/BillsPage';
import EditBillPage from './features/bills/EditBillPage';
import BillHistoryPage from './features/bills/BillHistoryPage';
import BillPreviewPage from './features/bills/BillPreviewPage';
import CustomersPage from './features/customers/CustomersPage';
import CustomerProfilePage from './features/customers/CustomerProfilePage';
import ProductsPage from './features/products/ProductsPage';
import InventoryPage from './features/inventory/InventoryPage';
import PaymentsPage from './features/payments/PaymentsPage';
import PaymentsDuePage from './features/payments/PaymentsDuePage';
import MetalRatesPage from './features/metal-rates/MetalRatesPage';
import ReportsPage from './features/reports/ReportsPage';
import UsersPage from './features/users/UsersPage';
import UserDetailsPage from './features/users/UserDetailsPage';
import SettingsPage from './features/settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                {/* Public Authentication Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Secure App Shell Routes */}
                <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/billing/new" element={<BillingPage />} />
                  <Route path="/bills" element={<BillsPage />} />
                  <Route path="/bills/:id/edit" element={<EditBillPage />} />
                  <Route path="/bills/:id/history" element={<BillHistoryPage />} />
                  <Route path="/bills/:id/preview" element={<BillPreviewPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:id" element={<CustomerProfilePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/payments" element={<Navigate to="/payments/due" replace />} />
                  <Route path="/payments/due" element={<PaymentsDuePage />} />
                  <Route path="/metal-rates" element={<MetalRatesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  
                  {/* Strict User Management Routing (Admin-Only) */}
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute requiredPermission="users.view">
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users/:id"
                    element={
                      <ProtectedRoute requiredPermission="users.view">
                        <UserDetailsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="/settings" element={<SettingsPage />} />
                  
                  {/* Catch-all Not Found Route inside App Shell */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
