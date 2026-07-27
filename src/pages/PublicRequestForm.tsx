import { useState, useRef, useMemo } from 'react';
import { useStore } from '../lib/store';
import SignatureCanvas from 'react-signature-canvas';
import { getBusinessDaysCount } from '../lib/utils';
import { format, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { Calendar, Megaphone, Briefcase } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export function PublicRequestForm() {
  const addRequest = useStore((state) => state.addRequest);
  const requests = useStore((state) => state.requests);
  const announcements = useStore((state) => state.announcements);
  const users = useStore((state) => state.users);
  
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const approvedRequests = requests.filter(r => r.status === 'approved');

  // Compute disabled dates (all approved requests dates)
  const disabledDays = useMemo(() => {
    const days: Date[] = [];
    approvedRequests.forEach(req => {
      try {
        const interval = eachDayOfInterval({
          start: new Date(req.startDate),
          end: new Date(req.endDate)
        });
        days.push(...interval);
      } catch (e) {
        // invalid date
      }
    });
    return days;
  }, [approvedRequests]);

  const checkAvailability = (start: string, end: string) => {
    try {
      const requestedDates = eachDayOfInterval({
        start: new Date(start),
        end: new Date(end)
      });

      for (const date of requestedDates) {
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

  // Live calculated remaining days
  const employeeUser = useMemo(() => {
    if (!employeeId) return null;
    return users.find(u => u.username === employeeId && u.name === employeeName);
  }, [employeeId, employeeName, users]);

  const quotaInfo = useMemo(() => {
    if (!employeeUser) return null;
    const currentYear = new Date().getFullYear();
    const myApprovedRequests = requests.filter(r => 
      r.status === 'approved' && 
      (r.userId === employeeUser.id || r.employeeId === employeeId) &&
      new Date(r.startDate).getFullYear() === currentYear
    );
    
    const usedDays = myApprovedRequests.reduce((total, req) => {
      return total + getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate));
    }, 0);
    
    return {
      annualQuota: employeeUser.annualQuota,
      usedDays,
      remainingDays: employeeUser.annualQuota - usedDays
    };
  }, [employeeUser, employeeId, requests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!employeeName) {
      setError('יש לבחור שם מהרשימה');
      return;
    }

    if (!employeeId.trim()) {
      setError('יש להזין תעודת זהות');
      return;
    }

    if (!employeeUser) {
      setError('תעודת הזהות אינה תואמת לשם העובד שנבחר, או שהעובד לא מוגדר במערכת.');
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      setError('יש לבחור טווח תאריכים ביומן');
      return;
    }

    const startStr = format(dateRange.from, 'yyyy-MM-dd');
    const endStr = format(dateRange.to, 'yyyy-MM-dd');

    if (isBefore(dateRange.to, dateRange.from)) {
      setError('תאריך הסיום חייב להיות אחרי תאריך ההתחלה');
      return;
    }

    if (isBefore(startOfDay(dateRange.from), startOfDay(new Date()))) {
      setError('לא ניתן לבקש חופשה לתאריכי עבר');
      return;
    }

    const requestedBusinessDays = getBusinessDaysCount(dateRange.from, dateRange.to);
    
    if (requestedBusinessDays === 0) {
      setError('הבקשה לא כוללת ימי עבודה (ימים א-ה)');
      return;
    }

    if (quotaInfo && requestedBusinessDays > quotaInfo.remainingDays) {
      setError(`חריגה ממכסת החופשות: ביקשת ${requestedBusinessDays} ימים, אך נותרו לך ${quotaInfo.remainingDays} ימים בלבד.`);
      return;
    }

    if (!checkAvailability(startStr, endStr)) {
      setError('אחד או יותר מהימים המבוקשים כבר תפוסים על ידי עובד אחר');
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      setError('יש לחתום על הבקשה');
      return;
    }

    const signatureData = signatureRef.current?.toDataURL();
    addRequest(employeeUser.id, employeeName, employeeId, startStr, endStr, signatureData);
    
    setEmployeeName('');
    setEmployeeId('');
    setDateRange(undefined);
    signatureRef.current?.clear();
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
    }, 5000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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

      {quotaInfo && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">יתרת ימי חופשה לעובד</p>
            <p className="text-2xl font-bold text-gray-900">
              {quotaInfo.remainingDays} ימים <span className="text-sm font-normal text-gray-500">מתוך {quotaInfo.annualQuota}</span>
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          בקשת חופשה חדשה
        </h2>
        
        {success ? (
          <div className="p-6 bg-green-50 rounded-xl border border-green-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-green-900 mb-1">הבקשה נשלחה בהצלחה!</h3>
            <p className="text-green-700">בקשתך הועברה לאישור המנהל. תשובה תימסר בהמשך.</p>
            <button 
              onClick={() => setSuccess(false)}
              className="mt-6 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              הגש בקשה נוספת
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                <select
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                >
                  <option value="" disabled>-- בחר עובד --</option>
                  {users.filter(u => u.role !== 'admin').map(user => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תעודת זהות</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]*"
                  placeholder="123456789"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תאריכי חופשה (בחר מהיומן)</label>
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex justify-center" dir="ltr">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={disabledDays}
                  modifiers={{ taken: disabledDays }}
                  modifiersStyles={{ taken: { color: '#ef4444', backgroundColor: '#fef2f2', textDecoration: 'line-through', fontWeight: 'bold' } }}
                  showOutsideDays
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">* ימים המסומנים באדום הם ימים שכבר נתפסו על ידי עובד אחר ומאושרים במערכת.</p>
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              שלח בקשה לאישור
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
