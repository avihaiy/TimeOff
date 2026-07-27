import { useState } from 'react';
import { useStore, type Role } from '../lib/store';
import { format } from 'date-fns';
import { ShieldCheck, UserPlus, XCircle, CheckCircle, Clock, Printer, KeySquare, Download } from 'lucide-react';
import { VacationCalendar } from '../components/VacationCalendar';
import { AdminStats } from '../components/AdminStats';
import { getBusinessDaysCount } from '../lib/utils';

export function AdminDashboard() {
  const requests = useStore((state) => state.requests);
  const users = useStore((state) => state.users);
  const updateRequestStatus = useStore((state) => state.updateRequestStatus);
  const addUser = useStore((state) => state.addUser);
  const updateUserPassword = useStore((state) => state.updateUserPassword);

  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('employee');
  const [newUserQuota, setNewUserQuota] = useState<number>(14);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPasswordForUser, setNewPasswordForUser] = useState('');

  const [exportMonth, setExportMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName && newUserUsername && newUserPassword) {
      if (users.find(u => u.username === newUserUsername)) {
        alert('שם המשתמש כבר קיים');
        return;
      }
      addUser(newUserName, newUserUsername, newUserPassword, newUserRole, newUserQuota);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('employee');
      setNewUserQuota(14);
      alert('משתמש נוצר בהצלחה');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId && newPasswordForUser) {
      updateUserPassword(selectedUserId, newPasswordForUser);
      setNewPasswordForUser('');
      setSelectedUserId('');
      alert('סיסמה שונתה בהצלחה!');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const [year, month] = exportMonth.split('-');
    
    const filteredRequests = requests.filter(req => {
      if (req.status !== 'approved') return false;
      const reqDate = new Date(req.startDate);
      return reqDate.getFullYear() === parseInt(year) && (reqDate.getMonth() + 1) === parseInt(month);
    });

    if (filteredRequests.length === 0) {
      alert('אין חופשות מאושרות בחודש זה.');
      return;
    }

    const headers = ['שם עובד', 'מתאריך', 'עד תאריך', 'סך ימי חופשה'];
    const rows = filteredRequests.map(req => {
      const user = users.find(u => u.id === req.userId);
      const days = getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate));
      return [
        user?.name || 'לא ידוע',
        format(new Date(req.startDate), 'dd/MM/yyyy'),
        format(new Date(req.endDate), 'dd/MM/yyyy'),
        days.toString()
      ];
    });

    // Add BOM for Hebrew Excel support
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vacations_report_${exportMonth}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> אושר</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> נדחה</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> ממתין</span>;
    }
  };

  return (
    <div className="space-y-8 print:space-y-0">
      <AdminStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Calendar View */}
        <div className="lg:col-span-1 print:hidden">
          <VacationCalendar />
        </div>

        {/* Requests Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-none print:p-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 print:hidden" />
              ניהול בקשות חופשה
            </h2>
            <div className="print:hidden flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <input 
                  type="month" 
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 font-medium"
                />
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-md font-medium transition-colors text-sm"
                  title="ייצוא לאקסל (CSV)"
                >
                  <Download className="w-4 h-4" />
                  אקסל
                </button>
              </div>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                ייצוא ל-PDF
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-200 print:bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">שם עובד</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">מתאריך</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">עד תאריך</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">הוגש ב</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600">סטטוס</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-600 print:hidden">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      אין בקשות חופשה במערכת
                    </td>
                  </tr>
                ) : (
                  requests.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => {
                    const user = users.find(u => u.id === req.userId);
                    return (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {user?.name || 'משתמש לא ידוע'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {format(new Date(req.startDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {format(new Date(req.endDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="px-6 py-4 print:hidden">
                          {req.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateRequestStatus(req.id, 'approved')}
                                className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                              >
                                אשר
                              </button>
                              <button
                                onClick={() => updateRequestStatus(req.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                              >
                                דחה
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">טופל</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
        {/* Change User Password */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <KeySquare className="w-5 h-5 text-blue-600" />
            איפוס סיסמה לעובד
          </h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">בחר משתמש</label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="" disabled>-- בחר --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה</label>
              <input
                type="text"
                required
                value={newPasswordForUser}
                onChange={(e) => setNewPasswordForUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="הקלד סיסמה חדשה"
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors mt-4"
            >
              שנה סיסמה
            </button>
          </form>
        </div>

        {/* Add New User */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            הוספת משתמש חדש
          </h2>
          
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מכסת ימי חופשה (שנתית)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newUserQuota}
                    onChange={(e) => setNewUserQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש</label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תפקיד</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="employee">עובד רגיל</option>
                    <option value="admin">מנהל מערכת</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors mt-4"
            >
              צור משתמש
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
