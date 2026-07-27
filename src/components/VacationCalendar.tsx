import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isWithinInterval, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { useStore } from '../lib/store';

export function VacationCalendar() {
  const requests = useStore((state) => state.requests);
  const users = useStore((state) => state.users);

  // We only want to show approved requests on the calendar
  const approvedRequests = useMemo(() => {
    return requests.filter(r => r.status === 'approved');
  }, [requests]);

  // Create modifiers for react-day-picker to highlight taken days
  const modifiers = useMemo(() => {
    const bookedDays: Date[] = [];
    
    approvedRequests.forEach(req => {
      const start = startOfDay(new Date(req.startDate));
      const end = startOfDay(new Date(req.endDate));
      
      // For each request, we could add the specific days. 
      // A simpler way is to just pass a match function to a modifier.
    });

    return {};
  }, [approvedRequests]);

  // Match function to determine if a day is booked
  const isBooked = (day: Date) => {
    return approvedRequests.some(req => {
      return isWithinInterval(day, {
        start: startOfDay(new Date(req.startDate)),
        end: startOfDay(new Date(req.endDate))
      });
    });
  };

  // Find who is on vacation on a specific day
  const getEmployeesOnVacation = (day: Date) => {
    const overlappingRequests = approvedRequests.filter(req => {
      return isWithinInterval(day, {
        start: startOfDay(new Date(req.startDate)),
        end: startOfDay(new Date(req.endDate))
      });
    });

    return overlappingRequests.map(req => {
      const user = users.find(u => u.id === req.userId);
      return user ? user.name : 'משתמש לא ידוע';
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
      <h2 className="text-xl font-bold text-gray-900 mb-6 self-start w-full text-right">
        יומן חופשות חודשי
      </h2>
      
      <style>{`
        .rdp {
          --rdp-cell-size: 45px;
          --rdp-accent-color: #2563eb;
          --rdp-background-color: #eff6ff;
          margin: 0;
        }
        .booked-day {
          background-color: #fee2e2;
          color: #991b1b;
          font-weight: bold;
          border-radius: 50%;
        }
        .booked-day:hover {
          background-color: #fca5a5;
        }
      `}</style>
      
      <DayPicker
        mode="multiple"
        locale={he}
        dir="rtl"
        modifiers={{ booked: isBooked }}
        modifiersClassNames={{ booked: 'booked-day' }}
        onDayClick={() => {}} // Disabled selection
        disabled={() => true} // Disable clicking entirely for the calendar view
        footer={
          <div className="mt-4 text-sm text-gray-600 text-right w-full">
            <span className="inline-block w-3 h-3 bg-red-100 rounded-full ml-2 align-middle border border-red-200"></span>
            יום חופשה (העבר את העכבר מעל התאריך לפרטים)
          </div>
        }
        components={{
          DayContent: (props) => {
            const bookedEmployees = getEmployeesOnVacation(props.date);
            const title = bookedEmployees.length > 0 
              ? `בחופש: ${bookedEmployees.join(', ')}`
              : undefined;

            return (
              <div title={title} className="w-full h-full flex items-center justify-center cursor-default">
                {format(props.date, 'd')}
              </div>
            );
          }
        }}
      />
    </div>
  );
}
