import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './lib/store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PublicRequestForm } from './pages/PublicRequestForm';
import { AdminDashboard } from './pages/AdminDashboard';
import { useEffect } from 'react';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'employee' }) {
  const currentUser = useStore((state) => state.currentUser);
  const isLoading = useStore((state) => state.isLoading);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">טוען נתונים...</div>;
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600 font-medium">מתחבר למערכת הענן...</div>;
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
    </Router>
  );
}

export default App;
