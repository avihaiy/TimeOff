import { useStore } from '../lib/store';
import { getBusinessDaysCount } from '../lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, Clock, XCircle, Megaphone, LogOut, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmployeeDashboard() {
  const currentUser = useStore((state) => state.currentUser);
  const requests = useStore((state) => state.requests);
  const announcements = useStore((state) => state.announcements);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();

  if (!currentUser) return null;

  const currentYear = new Date().getFullYear();
  
  const myRequests = requests.filter(r => r.userId === currentUser.id || r.employeeId === currentUser.username);
  
  const myApprovedRequestsThisYear = myRequests.filter(
    r => r.status === 'approved' && new Date(r.startDate).getFullYear() === currentYear
  );

  const usedDays = myApprovedRequestsThisYear.reduce(
    (total, req) => total + getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate)), 
    0
  );

  const remainingDays = currentUser.annualQuota - usedDays;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle className="w-3.5 h-3.5" /> אושר</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle className="w-3.5 h-3.5" /> נדחה</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200"><Clock className="w-3.5 h-3.5" /> ממתין לאישור</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">שלום, {currentUser.name} 👋</h1>
          <p className="text-gray-500 mt-2 text-lg">אזור אישי למעקב אחר ימי חופשה ובקשות</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            הגש בקשה חדשה
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            התנתק
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">מכסה שנתית ({currentYear})</p>
            <p className="text-3xl font-bold text-gray-900">{currentUser.annualQuota}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">נוצלו עד כה</p>
            <p className="text-3xl font-bold text-gray-900">{usedDays}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">ימים נותרים לניצול</p>
            <p className="text-3xl font-bold text-emerald-600">{remainingDays}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Requests History */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            היסטוריית בקשות החופשה שלי
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">תאריכים</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">מספר ימים</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">תאריך הגשה</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      טרם הגשת בקשות חופשה.
                    </td>
                  </tr>
                ) : (
                  myRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            מ- {format(new Date(req.startDate), 'dd/MM/yyyy')}
                          </span>
                          <span className="text-sm text-gray-500">
                            עד- {format(new Date(req.endDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700 text-center">
                        {getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            לוח מודעות
          </h2>
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                אין הודעות חדשות כרגע
              </p>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500 rounded-r-xl"></div>
                  <h3 className="font-bold text-gray-900 mb-2">{announcement.title}</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{announcement.content}</p>
                  <span className="text-xs text-gray-400 mt-4 block font-medium">
                    {format(new Date(announcement.createdAt), 'dd/MM/yyyy')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
