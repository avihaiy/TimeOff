import { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import SignatureCanvas from 'react-signature-canvas';
import { getBusinessDaysCount } from '../lib/utils';
import { format, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { Calendar, Clock, CheckCircle, XCircle, Briefcase, CalendarOff, CalendarPlus, Megaphone } from 'lucide-react';

const generateGoogleCalendarUrl = (startDate: string, endDate: string) => {
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);
  const formatForGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '').substring(0, 8);
  const dates = `${formatForGoogle(new Date(startDate))}/${formatForGoogle(end)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('חופשה מאושרת')}&dates=${dates}`;
};

export function EmployeeDashboard() {
  const currentUser = useStore((state) => state.currentUser);
  const addRequest = useStore((state) => state.addRequest);
  const requests = useStore((state) => state.requests);
  const announcements = useStore((state) => state.announcements);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const signatureRef = useRef<SignatureCanvas>(null);

  const myRequests = requests.filter(r => r.userId === currentUser?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Find all taken dates by ANY employee (approved status)
  const approvedRequests = requests.filter(r => r.status === 'approved');

  // Calculate quota usage
  const myApprovedRequests = myRequests.filter(r => r.status === 'approved');
  const usedDays = myApprovedRequests.reduce((total, req) => {
    return total + getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate));
  }, 0);
  
  const annualQuota = currentUser?.annualQuota || 0;
  const remainingDays = annualQuota - usedDays;

  const checkAvailability = (start: string, end: string) => {
    try {
      const requestedDates = eachDayOfInterval({
        start: new Date(start),
        end: new Date(end)
      });

      for (const date of requestedDates) {
        // Only check for overlap on business days? Actually, if someone is on vacation on Friday, it doesn't matter.
        // We just check if the date falls in any approved vacation range.
        const isTaken = approvedRequests.some(req => {
          const reqStart = startOfDay(new Date(req.startDate));
          const reqEnd = startOfDay(new Date(req.endDate));
          return date >= reqStart && date <= reqEnd;
        });
        
        if (isTaken) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('יש לבחור תאריכי התחלה וסיום');
      return;
    }

    if (isBefore(new Date(endDate), new Date(startDate))) {
      setError('תאריך הסיום חייב להיות אחרי תאריך ההתחלה');
      return;
    }

    if (isBefore(new Date(startDate), startOfDay(new Date()))) {
      setError('לא ניתן לבקש חופשה לתאריכי עבר');
      return;
    }

    const requestedBusinessDays = getBusinessDaysCount(new Date(startDate), new Date(endDate));
    
    if (requestedBusinessDays === 0) {
      setError('הבקשה לא כוללת ימי עבודה (ימים א-ה)');
      return;
    }

    if (requestedBusinessDays > remainingDays) {
      setError(`אין לך מספיק ימי חופשה. ביקשת ${requestedBusinessDays} ימים אך נותרו לך ${remainingDays} ימים בלבד.`);
      return;
    }

    if (!checkAvailability(startDate, endDate)) {
      setError('אחד או יותר מהימים המבוקשים כבר תפוסים על ידי עובד אחר');
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      setError('יש לחתום על הבקשה');
      return;
    }

    if (currentUser) {
      const signatureData = signatureRef.current?.toDataURL();
      addRequest(currentUser.id, startDate, endDate, signatureData);
      setStartDate('');
      setEndDate('');
      signatureRef.current?.clear();
    }
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
    <div className="space-y-8">
      
      {/* Quota Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">מכסה שנתית</p>
            <p className="text-2xl font-bold text-gray-900">{annualQuota} ימים</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
            <CalendarOff className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">נוצלו השנה</p>
            <p className="text-2xl font-bold text-gray-900">{usedDays} ימים</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">יתרה לניצול</p>
            <p className="text-2xl font-bold text-gray-900">{remainingDays} ימים</p>
          </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            לוח מודעות
          </h2>
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white p-4 rounded-xl shadow-sm border border-blue-50">
                <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{ann.content}</p>
                <span className="text-xs text-gray-400 mt-2 block">{format(new Date(ann.createdAt), 'dd/MM/yyyy')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              בקשת חופשה חדשה
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                  <span>חתימת עובד</span>
                  <button 
                    type="button" 
                    onClick={() => signatureRef.current?.clear()}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    נקה
                  </button>
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                  <SignatureCanvas 
                    ref={signatureRef}
                    canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                    backgroundColor="rgb(249,250,251)"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors focus:ring-4 focus:ring-blue-100"
              >
                הגש בקשה
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">היסטוריית בקשות שלי</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">מתאריך</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">עד תאריך</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">ימים</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">הוגש ב</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">סטטוס</th>
                    <th className="px-6 py-3 text-sm font-semibold text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        לא נמצאו בקשות חופשה קודמות
                      </td>
                    </tr>
                  ) : (
                    myRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {format(new Date(req.startDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {format(new Date(req.endDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'approved' && (
                            <a
                              href={generateGoogleCalendarUrl(req.startDate, req.endDate)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors"
                              title="הוסף ליומן גוגל"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              ליומן
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
