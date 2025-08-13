'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { eachDayOfInterval, format, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarDay } from './CalendarDay';

export function CalendarGrid() {
  const { activeCalendar, filters } = useProject();

  if (!activeCalendar || !activeCalendar.startDate || !activeCalendar.endDate) {
    return null;
  }

  const startDate = new Date(activeCalendar.startDate + 'T00:00:00');
  const endDate = new Date(activeCalendar.endDate + 'T00:00:00');

  // To make sure we have full weeks, we get the start of the week of the start date
  // and the end of the week of the end date.
  const calendarStartDate = startOfWeek(startDate);
  const calendarEndDate = endOfWeek(endDate);
  
  const days = eachDayOfInterval({
    start: calendarStartDate,
    end: calendarEndDate,
  });

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const filteredCalendarData = React.useMemo(() => {
    if (!activeCalendar) return {};
    if (filters.status.length === 0 && filters.types.length === 0 && filters.platforms.length === 0) {
      return activeCalendar.calendarData;
    }

    const filteredData: typeof activeCalendar.calendarData = {};

    for (const date in activeCalendar.calendarData) {
      const post = activeCalendar.calendarData[date];
      if (!post) continue;

      const statusMatch = filters.status.length === 0 || filters.status.includes(post.status);
      const typeMatch = filters.types.length === 0 || post.types.some(type => filters.types.includes(type));
      const platformMatch = filters.platforms.length === 0 || post.platforms.some(platform => filters.platforms.includes(platform));

      if (statusMatch && typeMatch && platformMatch) {
        filteredData[date] = post;
      }
    }

    return filteredData;
  }, [activeCalendar, filters]);


  return (
    <div id="calendar-grid" className="flex flex-col h-full">
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-500 mb-2">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 gap-2 flex-grow">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const post = activeCalendar?.calendarData[dateKey];
          const isCurrentMonth = day >= startDate && day <= endDate;

          const displayPost = filteredCalendarData[dateKey];

          return (
            <CalendarDay 
              key={day.toString()} 
              day={day} 
              isCurrentMonth={isCurrentMonth}
              post={displayPost ?? post} // Fallback to original post for drop target visibility
              isFilteredOut={!displayPost && !!post} // Is a post present but filtered out
            />
          );
        })}
      </div>
    </div>
  );
}
