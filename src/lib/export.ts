'use client';

import jsPDF from 'jspdf';
import { utils, writeFile } from 'xlsx';
import type { Calendar, Post, PostStatus } from './types';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

const statusColorMap: Record<PostStatus, string> = {
    Planned: '#cbd5e1',    // slate-300
    Edited: '#d8b4fe',     // purple-300
    Approved: '#fcd34d',   // amber-300
    Scheduled: '#93c5fd',  // blue-300
    Posted: '#86efac',     // green-300
    Missed: '#fca5a5'      // red-300
};

export const exportToPDF = async (calendar: Calendar, projectName: string) => {
    if (!calendar.startDate || !calendar.endDate) {
        alert('Please select a start and end date for the calendar.');
        return;
    }

    const startDate = new Date(calendar.startDate + 'T00:00:00');
    const endDate = new Date(calendar.endDate + 'T00:00:00');

    const calendarStart = startOfWeek(startDate);
    const calendarEnd = endOfWeek(endDate);
    
    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });
    
    const numWeeks = Math.ceil(days.length / 7);

    // Define dimensions
    const margin = 40;
    const headerHeight = 80;
    const weekdayHeaderHeight = 25;
    const cellWidth = 120;
    const cellHeight = 100;
    const gridWidth = cellWidth * 7;
    const gridHeight = cellHeight * numWeeks;

    const totalWidth = gridWidth + margin * 2;
    const totalHeight = headerHeight + weekdayHeaderHeight + gridHeight + margin * 2;
    
    const orientation = totalWidth > totalHeight ? 'l' : 'p';
    
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: [totalWidth, totalHeight],
    });

    // Main Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${projectName} - ${calendar.name}`, margin, margin + 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    const dateRange = `${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}`;
    doc.text(dateRange, margin, margin + 35);
    
    doc.setFontSize(10);
    doc.text(`Exported on: ${format(new Date(), 'PPP')}`, totalWidth - margin, margin + 10, { align: 'right' });

    // Weekday Headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const gridX = margin;
    const gridY = headerHeight;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(gridX, gridY, gridWidth, weekdayHeaderHeight, 'F');
    
    weekdays.forEach((day, i) => {
        doc.text(day, gridX + i * cellWidth + cellWidth / 2, gridY + weekdayHeaderHeight / 2, { align: 'center', baseline: 'middle' });
    });

    // Calendar Grid
    const gridContentY = gridY + weekdayHeaderHeight;

    days.forEach((day, i) => {
        const row = Math.floor(i / 7);
        const col = i % 7;
        const cellX = gridX + col * cellWidth;
        const cellY = gridContentY + row * cellHeight;
        
        // Cell border
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.rect(cellX, cellY, cellWidth, cellHeight, 'S');
        
        // Date number
        const isCurrentRange = day >= startDate && day <= endDate;
        doc.setFontSize(10);
        doc.setFont('helvetica', isCurrentRange ? 'bold' : 'normal');
        doc.setTextColor(isCurrentRange ? '#000' : '#94a3b8'); // black or slate-400
        doc.text(format(day, 'd'), cellX + 5, cellY + 12);
        
        // Post content
        const dateKey = format(day, 'yyyy-MM-dd');
        const post = calendar.calendarData[dateKey];
        if (post && isCurrentRange) {
            const padding = 5;
            let textY = cellY + 28;
            const lineSpacing = 11;

            // Theme color indicator
            if (post.color && post.color !== 'transparent') {
                doc.setFillColor(post.color);
                doc.rect(cellX + 2, cellY + 2, 4, cellHeight - 4, 'F');
            }

            // Status
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#475569'); // slate-600
            const statusColor = statusColorMap[post.status] || '#cbd5e1';
            doc.setFillColor(statusColor);
            doc.circle(cellX + padding + 5, textY - 4, 4, 'F');
            doc.text(post.status, cellX + padding + 12, textY);
            textY += lineSpacing + 2;

            // Title
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#1e293b'); // slate-800
            const titleLines = doc.splitTextToSize(post.title, cellWidth - padding * 2 - 8);
            doc.text(titleLines, cellX + padding, textY);
            textY += lineSpacing * titleLines.length;

            // Post Types
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#334155'); // slate-700
            const typesText = post.types.join(', ');
            const typeLines = doc.splitTextToSize(typesText, cellWidth - padding * 2);
            doc.text(typeLines, cellX + padding, textY);
            textY += lineSpacing * typeLines.length;

            // Platforms
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor('#64748b'); // slate-500
            const platformText = 'on: ' + post.platforms.join(', ');
            const platformLines = doc.splitTextToSize(platformText, cellWidth - padding * 2);
            doc.text(platformLines, cellX + padding, textY + 5);
        }
    });

    doc.save(`${projectName.replace(/\s+/g, '-')}-${calendar.name.replace(/\s+/g, '-')}.pdf`);
};

export const exportToExcel = (calendar: Calendar) => {
  if (Object.keys(calendar.calendarData).length === 0) {
    alert('No data to export.');
    return;
  }
  const dataToExport = Object.entries(calendar.calendarData).map(
    ([date, d]) => ({
      Date: date,
      Title: d.title,
      Status: d.status,
      'Post Types': d.types.join(', '),
      Platforms: d.platforms.join(', '),
      Notes: d.notes,
      Color: d.color,
    })
  );
  dataToExport.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
  
  const worksheet = utils.json_to_sheet(dataToExport);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Content Calendar');
  
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 40 }, // Title
    { wch: 15 }, // Status
    { wch: 25 }, // Post Types
    { wch: 30 }, // Platforms
    { wch: 50 }, // Notes
    { wch: 15 }, // Color
  ];
  
  writeFile(workbook, `${calendar.name.replace(/\s+/g, '-')}-export.xlsx`);
};


export const exportToFile = (calendar: Calendar) => {
  if (Object.keys(calendar.calendarData).length === 0 && (!calendar.startDate || !calendar.endDate)) {
    alert('There is nothing to save.');
    return;
  }

  // Only export calendar-specific data
  const exportData = {
    name: calendar.name,
    startDate: calendar.startDate,
    endDate: calendar.endDate,
    calendarData: calendar.calendarData,
  }

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${calendar.name.replace(/\s+/g, '-')}.ccpro`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
