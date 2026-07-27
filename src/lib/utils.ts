import { eachDayOfInterval } from 'date-fns';
import { HebrewCalendar, flags } from '@hebcal/core';

// Cache holidays per year to avoid recalculating
const holidaysCache: Record<number, Set<string>> = {};

function getHolidaysForYear(year: number): Set<string> {
  if (holidaysCache[year]) return holidaysCache[year];

  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true, // Israel holidays
  });

  const holidayDates = new Set<string>();
  for (const ev of events) {
    // CHAG is a Yom Tov (work forbidden)
    if (ev.getFlags() & flags.CHAG) {
      const date = ev.getDate().greg();
      holidayDates.add(date.toISOString().split('T')[0]);
    }
  }

  holidaysCache[year] = holidayDates;
  return holidayDates;
}

export function isJewishHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  return holidays.has(date.toISOString().split('T')[0]);
}

export function getBusinessDaysCount(startDate: Date, endDate: Date): number {
  try {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const businessDays = days.filter(day => {
      const dayOfWeek = day.getDay();
      // Filter out Friday (5), Saturday (6), and Jewish Holidays (Yom Tov)
      if (dayOfWeek === 5 || dayOfWeek === 6) return false;
      if (isJewishHoliday(day)) return false;
      
      return true;
    });
    
    return businessDays.length;
  } catch {
    return 0;
  }
}
