'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { eachDayOfInterval, format, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarDay } from './CalendarDay';

export function CalendarGrid() {
  const { activeProjectData } = useProject();

  if (!activeProjectData || !activeProjectData.startDate || !activeProjectData.endDate) {
    return null;
  }

  const startDate = new Date(activeProjectData.startDate + 'T00:00:00');
  const endDate = new Date(activeProjectData.endDate + 'T00:00:00');

  // To make sure we have full weeks, we get the start of the week of the start date
  // and the end of the week of the end date.
  const calendarStartDate = startOfWeek(startDate);
  const calendarEndDate = endOfWeek(endDate);
  
  const days = eachDayOfInterval({
    start: calendarStartDate,
    end: calendarEndDate,
  });

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div id="calendar-grid" className="flex flex-col h-full">
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-500 mb-2">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 gap-2 flex-grow">
        {days.map((day) => (
          <CalendarDay 
            key={day.toString()} 
            day={day} 
            isCurrentMonth={day >= startDate && day <= endDate}
            post={activeProjectData.calendarData[format(day, 'yyyy-MM-dd')]}
          />
        ))}
      </div>
    </div>
  );
}
