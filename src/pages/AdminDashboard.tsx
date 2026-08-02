import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStore, type Role } from '../lib/store';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Download, Printer, ShieldCheck, XCircle, Users, Megaphone, CalendarDays, KeySquare, UserPlus, Edit, Trash2, X, Save, Upload } from 'lucide-react';
import confetti from 'canvas-confetti';
import { VacationCalendar } from '../components/VacationCalendar';
import { AdminStats } from '../components/AdminStats';
import { getBusinessDaysCount } from '../lib/utils';

type AdminTab = 'vacations' | 'users' | 'announcements';

export function AdminDashboard() {
  const requests = useStore((state) => state.requests);
  const users = useStore((state) => state.users);
  const updateRequestStatus = useStore((state) => state.updateRequestStatus);
  const addUser = useStore((state) => state.addUser);
  const addUsersBatch = useStore((state) => state.addUsersBatch);
  const updateUser = useStore((state) => state.updateUser);
  const deleteUser = useStore((state) => state.deleteUser);
  const updateUserPassword = useStore((state) => state.updateUserPassword);
  const deleteRequest = useStore((state) => state.deleteRequest);

  const addAnnouncement = useStore((state) => state.addAnnouncement);
  const deleteAnnouncement = useStore((state) => state.deleteAnnouncement);
  const announcements = useStore((state) => state.announcements);

  const [activeTab, setActiveTab] = useState<AdminTab>('vacations');

  const handleStatusChange = (reqId: string, newStatus: 'approved' | 'rejected') => {
    updateRequestStatus(reqId, newStatus);
    if (newStatus === 'approved') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#ffffff']
      });
      toast.success('בקשת החופשה אושרה בהצלחה!');
    } else {
      toast.success('בקשת החופשה נדחתה');
    }
  };

  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('employee');
  const [newUserQuota, setNewUserQuota] = useState<number>(14);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<{ name: string, username: string, annualQuota: number, role: Role, email?: string }>({ name: '', username: '', annualQuota: 14, role: 'employee', email: '' });

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPasswordForUser, setNewPasswordForUser] = useState('');

  const [exportMonth, setExportMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnnouncementTitle && newAnnouncementContent) {
      addAnnouncement(newAnnouncementTitle, newAnnouncementContent);
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      toast.success('הודעה פורסמה בהצלחה!');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName && newUserUsername && newUserPassword) {
      if (users.find(u => u.username === newUserUsername)) {
        toast.success('שם המשתמש כבר קיים');
        return;
      }
      addUser(newUserName, newUserUsername, newUserPassword, newUserRole, newUserQuota, newUserEmail);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserEmail('');
      setNewUserRole('employee');
      setNewUserQuota(14);
      toast.success('משתמש נוצר בהצלחה');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId && newPasswordForUser) {
      updateUserPassword(selectedUserId, newPasswordForUser);
      setNewPasswordForUser('');
      setSelectedUserId('');
      toast.success('סיסמה שונתה בהצלחה!');
    }
  };

  const startEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditUserForm({
      name: user.name,
      username: user.username,
      annualQuota: user.annualQuota,
      role: user.role || 'employee',
      email: user.email || ''
    });
  };

  const handleSaveEditUser = async (userId: string) => {
    if (!editUserForm.name.trim() || !editUserForm.username.trim()) {
      toast.success('יש למלא שם מלא ותעודת זהות');
      return;
    }
    
    // Check if new username (ID) already exists for another user
    const existingUser = users.find(u => u.username === editUserForm.username && u.id !== userId);
    if (existingUser) {
      toast.success('תעודת זהות זו כבר קיימת במערכת עבור עובד אחר.');
      return;
    }

    await updateUser(userId, editUserForm);
    setEditingUserId(null);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את העובד ${userName}? שימו לב - זה ימחק גם את כל בקשות החופשה שלו (פעולה בלתי הפיכה!).`)) {
      await deleteUser(userId);
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim().length > 0);
      // Skip header if it exists (check first line)
      const startIndex = lines[0].includes('שם') ? 1 : 0;
      
      const newUsers = [];
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        // Handle CSV parsing simply (assuming no quoted commas for now)
        const parts = line.split(',');
        if (parts.length >= 3) {
          const name = parts[0].trim();
          const username = parts[1].trim(); // ID
          const annualQuota = parseInt(parts[2].trim(), 10) || 12;

          if (name && username && !users.find(u => u.username === username)) {
            newUsers.push({ name, username, annualQuota });
          }
        }
      }

      if (newUsers.length > 0) {
        await addUsersBatch(newUsers);
        alert(`יובאו בהצלחה ${newUsers.length} עובדים חדשים!`);
      } else {
        toast.success('לא נמצאו עובדים חדשים לייבוא (או שהקובץ אינו בפורמט הנכון). פורמט תקין: שם, תעודת זהות, מכסת ימים');
      }
      
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportEmployeesCSV = () => {
    const employees = users.filter(u => u.role !== 'admin');
    if (employees.length === 0) {
      toast.success('אין עובדים במערכת.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const headers = ['שם עובד', 'תעודת זהות', 'מכסה שנתית', 'נוצלו השנה', 'יתרה'];
    
    const rows = employees.map(user => {
      const myApprovedRequests = requests.filter(r => 
        r.status === 'approved' && 
        (r.userId === user.id || r.employeeId === user.username) &&
        new Date(r.startDate).getFullYear() === currentYear
      );
      const usedDays = myApprovedRequests.reduce((total, req) => total + getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate)), 0);
      const remainingDays = user.annualQuota - usedDays;

      return [
        user.name,
        user.username,
        user.annualQuota,
        usedDays,
        remainingDays
      ];
    });

    const csvContent = [
      '\uFEFF' + headers.join(','), // \uFEFF for Hebrew BOM
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      toast.success('אין חופשות מאושרות בחודש זה.');
      return;
    }

    const headers = ['שם עובד', 'ת.ז.', 'מתאריך', 'עד תאריך', 'סך ימי חופשה'];
    const rows = filteredRequests.map(req => {
      const days = getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate));
      return [
        req.employeeName || 'לא ידוע',
        req.employeeId || '-',
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> <span className="animate-pulse">ממתין</span></span>;
    }
  };

  return (
    <div className="space-y-6 print:space-y-0">
      
      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 grid grid-cols-3 sm:flex gap-1 sm:gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('vacations')}
          className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium transition-colors text-center ${
            activeTab === 'vacations' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="whitespace-normal sm:whitespace-nowrap leading-tight">ניהול חופשות</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium transition-colors text-center ${
            activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="whitespace-normal sm:whitespace-nowrap leading-tight">ניהול עובדים</span>
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium transition-colors text-center ${
            activeTab === 'announcements' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Megaphone className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="whitespace-normal sm:whitespace-nowrap leading-tight">לוח מודעות</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
      {activeTab === 'vacations' && (
        <motion.div 
          key="vacations"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8 print:space-y-0"
        >
          <AdminStats />
          
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-8">
            
            {/* Calendar View */}
            <div className="lg:col-span-1 print:hidden">
              <VacationCalendar />
            </div>

            {/* Requests Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 print:shadow-none print:border-none print:p-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600 print:hidden" />
                  ניהול בקשות חופשה
                </h2>
                <div className="print:hidden flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="flex flex-1 sm:flex-none items-center gap-2 bg-gray-50 p-1.5 sm:p-2 rounded-lg border border-gray-200">
                    <input 
                      type="month" 
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 font-medium w-full min-w-[120px]"
                    />
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-md font-medium transition-colors text-sm whitespace-nowrap"
                      title="ייצוא לאקסל (CSV)"
                    >
                      <Download className="w-4 h-4" />
                      אקסל
                    </button>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all hover:scale-[1.02] whitespace-nowrap"
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
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">שם עובד</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">ת.ז.</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">מתאריך</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">עד תאריך</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">הוגש ב</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">חתימה</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600">סטטוס</th>
                      <th className="px-3 py-3 text-sm font-semibold text-gray-600 print:hidden">פעולות</th>
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
                        return (
                          <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                              {req.employeeName || 'משתמש לא ידוע'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-500">
                              {req.employeeId || '-'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              {format(new Date(req.startDate), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              {format(new Date(req.endDate), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-500">
                              {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-3 py-3">
                              {req.signature ? (
                                <img src={req.signature} alt="חתימת עובד" className="h-8 max-w-[100px] object-contain bg-white rounded border border-gray-100" />
                              ) : (
                                <span className="text-xs text-gray-400">ללא</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {getStatusBadge(req.status)}
                            </td>
                            <td className="px-3 py-3 print:hidden">
                              <div className="flex items-center gap-2">
                                {req.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(req.id, 'approved')}
                                      className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      אשר
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(req.id, 'rejected')}
                                      className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      דחה
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-sm flex-1">טופל</span>
                                )}
                                <button
                                  onClick={() => deleteRequest(req.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="מחק בקשה לצמיתות"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
        </motion.div>
      )}

      {/* Users Management Section */}
      {activeTab === 'users' && (
        <motion.div 
          key="users"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8 print:hidden"
        >
          {/* Employee Pool Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                מאגר עובדים
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExportEmployeesCSV}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-blue-200 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  ייצוא לאקסל
                </button>
                <label className="cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-emerald-200 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  ייבוא מקובץ Excel (CSV)
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600">שם עובד</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600">ת.ז.</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600 text-center">מכסה</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600 text-center">נוצלו</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600 text-center">יתרה</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600 text-center">תפקיד</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600 text-center">אימייל</th>
                    <th className="px-3 py-3 text-sm font-semibold text-gray-600 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        לא נמצאו עובדים במערכת. לחץ על כפתור הייבוא כדי להוסיף.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const currentYear = new Date().getFullYear();
                      const myApprovedRequests = requests.filter(r => 
                        r.status === 'approved' && 
                        (r.userId === user.id || r.employeeId === user.username) &&
                        new Date(r.startDate).getFullYear() === currentYear
                      );
                      const usedDays = myApprovedRequests.reduce((total, req) => total + getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate)), 0);
                      const remainingDays = user.annualQuota - usedDays;

                      return editingUserId === user.id ? (
                        <tr key={user.id} className="bg-blue-50/30">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editUserForm.name}
                              onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editUserForm.username}
                              onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={editUserForm.annualQuota}
                              onChange={(e) => setEditUserForm({ ...editUserForm, annualQuota: Number(e.target.value) })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-center"
                            />
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 text-center">{usedDays}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-emerald-600 text-center">{remainingDays}</td>
                          <td className="px-4 py-3">
                            <select
                              value={editUserForm.role}
                              onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as Role })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                              <option value="employee">עובד</option>
                              <option value="admin">מנהל</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="email"
                              value={editUserForm.email || ''}
                              onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                              placeholder="אימייל"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSaveEditUser(user.id)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="שמור"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"
                                title="ביטול"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-3 py-3 text-sm text-gray-500">{user.username}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 text-center">{user.annualQuota}</td>
                          <td className="px-3 py-3 text-sm text-gray-500 text-center">{usedDays}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-emerald-600 text-center">{remainingDays}</td>
                          <td className="px-3 py-3 text-sm text-gray-500 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {user.role === 'admin' ? 'מנהל' : 'עובד'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500">{user.email || '-'}</td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEditUser(user)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="ערוך פרטים"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="מחק עובד"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Change User Password */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <KeySquare className="w-5 h-5 text-blue-600" />
                החלפת סיסמה (עובד / מנהל)
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
                הוספת משתמש חדש (ידני)
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">מכסת ימים</label>
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש (תעודת זהות)</label>
                      <input
                        type="text"
                        required
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">אימייל (אופציונלי)</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
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
        </motion.div>
      )}

      {/* Announcements Section */}
      {activeTab === 'announcements' && (
        <motion.div 
          key="announcements"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:hidden"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-blue-600">📢</span> לוח מודעות
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Post new announcement */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">פרסום הודעה חדשה</h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כותרת</label>
                <input
                  type="text"
                  required
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="למשל: חג פסח שמח!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תוכן</label>
                <textarea
                  required
                  rows={4}
                  value={newAnnouncementContent}
                  onChange={(e) => setNewAnnouncementContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  placeholder="הזן את פרטי ההודעה כאן..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                פרסם מודעה
              </button>
            </form>
          </div>

          {/* List of announcements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">הודעות אחרונות</h3>
            {announcements.length === 0 ? (
              <p className="text-gray-500 text-sm">אין הודעות פעילות.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{ann.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
                      <span className="text-xs text-gray-400 mt-2 block">
                        פורסם ב: {format(new Date(ann.createdAt), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="מחק הודעה"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
