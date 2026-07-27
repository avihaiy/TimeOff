import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { LogOut, Download, Clock, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HDate } from '@hebcal/core';
import { motion } from 'framer-motion';

function HebrewDateTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get reliable Hebrew date using hebcal and remove vowels (niqqud)
  const hebrewDate = new HDate(time).renderGematriya().replace(/[\u0591-\u05C7]/g, '');

  const timeString = time.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">
      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span dir="ltr">{timeString}</span>
      </div>
      <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      <div className="text-gray-500 dark:text-gray-400">{hebrewDate}</div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const currentUser = useStore((state) => state.currentUser);
  const logout = useStore((state) => state.logout);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => { if (isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); } }, [isDark]);
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
      <nav className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 shrink-0">
                <img src="/icon-192.png" alt="לוגו המועצה" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap">המועצה הדתית עכו</h1>
                <HebrewDateTime />
              </div>
            </div>
            
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300">
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
                
                {currentUser.role === 'admin' ? (
                  location.pathname === '/admin' ? (
                    <Link
                      to="/employee"
                      className="text-xs sm:text-sm bg-blue-50 text-blue-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200 whitespace-nowrap"
                    >
                      החופשות שלי
                    </Link>
                  ) : (
                    <Link
                      to="/admin"
                      className="text-xs sm:text-sm bg-purple-50 text-purple-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors font-medium border border-purple-200 whitespace-nowrap"
                    >
                      פאנל ניהול
                    </Link>
                  )
                ) : (
                  location.pathname !== '/employee' && (
                    <Link
                      to="/employee"
                      className="text-xs sm:text-sm bg-blue-50 text-blue-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200 whitespace-nowrap"
                    >
                      אזור אישי
                    </Link>
                  )
                )}

                <button onClick={() => setIsDark(!isDark)} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-all hover:scale-105" title="החלף ערכת נושא">
  {isDark ? <Sun className="w-5 h-5 sm:w-4 sm:h-4" /> : <Moon className="w-5 h-5 sm:w-4 sm:h-4" />}
</button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  title="התנתק"
                >
                  <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">התנתק</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => setIsDark(!isDark)} className="flex items-center p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-all hover:scale-105" title="החלף ערכת נושא">
  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
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
                <Link
                  to="/login"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  כניסת מנהל
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
