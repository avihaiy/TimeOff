import { Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function FloatingActionButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show the button if we are already on the request form page
  if (location.pathname === '/') return null;

  return (
    <button
      onClick={() => navigate('/')}
      className="md:hidden fixed bottom-20 left-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl shadow-blue-500/50 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center animate-in slide-in-from-bottom-10"
      title="הגש בקשה חדשה"
    >
      <Plus className="w-7 h-7" />
    </button>
  );
}
