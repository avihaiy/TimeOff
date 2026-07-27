import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useStore } from '../lib/store';
import { getBusinessDaysCount } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function AdminStats() {
  const requests = useStore((state) => state.requests);
  const users = useStore((state) => state.users);

  const currentYear = new Date().getFullYear();

  const approvedRequestsThisYear = useMemo(() => {
    return requests.filter(req => {
      if (req.status !== 'approved') return false;
      const date = new Date(req.startDate);
      return date.getFullYear() === currentYear;
    });
  }, [requests, currentYear]);

  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: MONTHS_HE[i],
      days: 0
    }));

    approvedRequestsThisYear.forEach(req => {
      const month = new Date(req.startDate).getMonth();
      const days = getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate));
      data[month].days += days;
    });

    return data;
  }, [approvedRequestsThisYear]);

  const employeeData = useMemo(() => {
    const userDays: Record<string, { days: number, name: string }> = {};

    approvedRequestsThisYear.forEach(req => {
      const days = getBusinessDaysCount(new Date(req.startDate), new Date(req.endDate));
      const key = req.employeeId || req.userId || 'unknown';
      if (!userDays[key]) {
        userDays[key] = { days: 0, name: req.employeeName || users.find(u => u.id === req.userId)?.name || 'לא ידוע' };
      }
      userDays[key].days += days;
    });

    return Object.values(userDays)
      .map((user) => ({
        name: user.name,
        value: user.days
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [approvedRequestsThisYear, users]);

  if (approvedRequestsThisYear.length === 0) {
    return null; // Don't show stats if there's no data
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:hidden">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 text-right">ניצול ימי חופשה לפי חודשים ({currentYear})</h3>
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} angle={-45} textAnchor="end" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
              <Bar dataKey="days" name="ימי חופשה" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 text-right">התפלגות חופשות לפי עובד ({currentYear})</h3>
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={employeeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {employeeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
