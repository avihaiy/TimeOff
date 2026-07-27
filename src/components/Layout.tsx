import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { LogOut, Calendar, Download } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  const currentUser = useStore((state) => state.currentUser);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    const result = await installPrompt.prompt();
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">המועצה הדתית עכו</h1>
            </div>
            
            {currentUser && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  שלום, <span className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</span>
                </span>

                {installPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200"
                    title="התקן אפליקציה למכשיר"
                  >
                    <Download className="w-4 h-4" />
                    התקן אפליקציה
                  </button>
                )}
                
                {currentUser.role === 'admin' && (
                  location.pathname === '/admin' ? (
                    <Link
                      to="/employee"
                      className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                    >
                      החופשות שלי
                    </Link>
                  ) : (
                    <Link
                      to="/admin"
                      className="text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors font-medium border border-purple-200"
                    >
                      פאנל ניהול
                    </Link>
                  )
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  התנתק
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
