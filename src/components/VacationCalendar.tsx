import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { isWithinInterval, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { useStore } from '../lib/store';
import { HDate } from '@hebcal/core';
import { isJewishHoliday } from '../lib/utils';

export function VacationCalendar() {
  const requests = useStore((state) => state.requests);


  // We only want to show approved requests on the calendar
  const approvedRequests = useMemo(() => {
    return requests.filter(r => r.status === 'approved');
  }, [requests]);



  // Match function to determine if a day is booked
  const isBooked = (day: Date) => {
    return approvedRequests.some(req => {
      return isWithinInterval(day, {
        start: startOfDay(new Date(req.startDate)),
        end: startOfDay(new Date(req.endDate))
      });
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
      
      <div className="w-full flex justify-center pb-2">
        <DayPicker
          mode="multiple"
          locale={he}
          dir="rtl"
          modifiers={{ booked: isBooked }}
        modifiersClassNames={{ booked: 'booked-day' }}
        onDayClick={() => {}} // Disabled selection
        disabled={() => true} // Disable clicking entirely for the calendar view
        footer={
          <div className="mt-4 text-sm text-gray-600 flex justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-blue-400 rounded-full"></span>
              <span>יום חג / שבתון</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-100 rounded-full border border-red-200"></span>
              <span>יום חופשה (העבר את העכבר מעל התאריך)</span>
            </div>
          </div>
        }
        components={{
          DayButton: (props) => {
            const { day, modifiers, ...buttonProps } = props as any;
            const hd = new HDate(day.date);
            const hebrewDay = hd.renderGematriya().split(' ')[0];
            const isHoliday = isJewishHoliday(day.date);
            
            if (isHoliday) {
              buttonProps.title = 'חג / שבתון';
            }

            return (
              <button 
                {...buttonProps} 
                className={`${buttonProps.className || ''} flex flex-col items-center justify-center relative`}
              >
                <span className="font-medium">{day.date.getDate()}</span>
                <span className="text-[10px] opacity-70 leading-none mt-0.5">{hebrewDay}</span>
                {isHoliday && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>}
              </button>
            );
          }
        }}
      />
      </div>
    </div>
  );
}
