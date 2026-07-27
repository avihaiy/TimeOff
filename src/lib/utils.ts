import { eachDayOfInterval } from 'date-fns';

export function getBusinessDaysCount(startDate: Date, endDate: Date): number {
  try {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    // In Israel, weekend is usually Friday and Saturday.
    // date-fns isWeekend treats Saturday and Sunday as weekend by default, but let's be explicit if we want.
    // However, isWeekend uses the locale or defaults to 0 and 6 (Sunday and Saturday).
    // Let's implement a custom check for Friday (5) and Saturday (6).
    const businessDays = days.filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek !== 5 && dayOfWeek !== 6;
    });
    
    return businessDays.length;
  } catch {
    return 0;
  }
}
