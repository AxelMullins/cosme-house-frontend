import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AppLayout } from '@/components/shared/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { CategoriesPage } from '@/features/categories/CategoriesPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/categories', element: <CategoriesPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
