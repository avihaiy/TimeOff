import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './lib/store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PublicRequestForm } from './pages/PublicRequestForm';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { useEffect } from 'react';

function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" dir="rtl">
      <div className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 sm:px-6 lg:px-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl"></div>
          <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
        </div>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
      </div>
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
        <div className="flex gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 sm:h-32 flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 sm:h-96 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'employee' }) {
  const currentUser = useStore((state) => state.currentUser);
  const isLoading = useStore((state) => state.isLoading);

  if (isLoading) {
    return <FullPageSkeleton />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (role && currentUser.role !== role && currentUser.role !== 'admin') {
    // Admin can access everything, employee can only access employee routes
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  const currentUser = useStore((state) => state.currentUser);
  const fetchInitialData = useStore((state) => state.fetchInitialData);
  const isLoading = useStore((state) => state.isLoading);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (isLoading) {
    return <FullPageSkeleton />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/employee" 
          element={
            <ProtectedRoute role="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/" 
          element={
            currentUser?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Layout>
                <PublicRequestForm />
              </Layout>
            )
          } 
        />
      </Routes>
      <Toaster position="bottom-center" toastOptions={{ className: 'font-medium text-sm' }} />
    </Router>
  );
}

export default App;
