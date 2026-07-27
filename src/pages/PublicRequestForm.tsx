import { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import SignatureCanvas from 'react-signature-canvas';
import { getBusinessDaysCount } from '../lib/utils';
import { format, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { Calendar, Megaphone } from 'lucide-react';

export function PublicRequestForm() {
  const addRequest = useStore((state) => state.addRequest);
  const requests = useStore((state) => state.requests);
  const announcements = useStore((state) => state.announcements);
  
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const approvedRequests = requests.filter(r => r.status === 'approved');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!employeeName.trim() || !employeeId.trim()) {
      setError('יש להזין שם מלא ותעודת זהות');
      return;
    }

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

    if (!checkAvailability(startDate, endDate)) {
      setError('אחד או יותר מהימים המבוקשים כבר תפוסים על ידי עובד אחר (המערכת מתירה רק עובד אחד בחופשה בכל יום)');
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      setError('יש לחתום על הבקשה');
      return;
    }

    const signatureData = signatureRef.current?.toDataURL();
    addRequest(null, employeeName, employeeId, startDate, endDate, signatureData);
    
    setEmployeeName('');
    setEmployeeId('');
    setStartDate('');
    setEndDate('');
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                <input
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
