'use client';

import jsPDF from 'jspdf';
import { utils, writeFile } from 'xlsx';
import type { Calendar, Post } from './types';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getMonth } from 'date-fns';
import { InstagramIcon, YouTubeIcon, LinkedInIcon, FacebookIcon, WebsiteIcon, OtherPlatformIcon } from '@/components/icons';
import { svgToPng } from './svgUtils';

// A map from platform names to their SVG icon components
const platformIconMap: Record<string, (props: React.SVGProps<SVGSVGElement>) => JSX.Element> = {
    Instagram: InstagramIcon,
    YouTube: YouTubeIcon,
    LinkedIn: LinkedInIcon,
    Facebook: FacebookIcon,
    Website: WebsiteIcon,
    Other: OtherPlatformIcon,
};

const statusColorMap: Record<Post['status'], string> = {
    Planned: '#cbd5e1',       // slate-300
    'On Approval': '#fcd34d', // amber-300
    Scheduled: '#93c5fd',     // blue-300
    Posted: '#86efac',        // green-300
    Edited: '#d8b4fe'         // purple-300
};

export const exportToPDF = async (calendar: Calendar, projectName: string) => {
    if (!calendar.startDate || !calendar.endDate) {
        alert('Please select a start and end date for the calendar.');
        return;
    }

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 30;

    const startDate = new Date(calendar.startDate + 'T00:00:00');
    const endDate = new Date(calendar.endDate + 'T00:00:00');
    let currentMonth = -1;

    const months = eachDayOfInterval({ start: startDate, end: endDate }).reduce((acc, date) => {
        const month = date.getMonth();
        if (!acc.includes(month)) {
            acc.push(month);
        }
        return acc;
    }, [] as number[]);

    const totalPages = months.length;
    let pageNum = 0;

    // Create PNGs for all icons once
    const iconPngCache: Record<string, string> = {};
    for (const platform in platformIconMap) {
        iconPngCache[platform] = await svgToPng(platformIconMap[platform]({}), 24, 24);
    }
    
    for (const month of months) {
        pageNum++;
        const currentMonthDate = new Date(startDate.getFullYear(), month, 1);
        
        if (currentMonth !== -1) {
            doc.addPage();
        }
        currentMonth = month;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${projectName} - ${calendar.name}`, margin, margin + 10);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(format(currentMonthDate, 'MMMM yyyy'), margin, margin + 35);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Exported on: ${format(new Date(), 'PPP')}`, pageWidth - margin, margin + 10, { align: 'right' });


        // Weekday Headers
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const gridX = margin;
        const gridY = margin + 60;
        const gridWidth = pageWidth - (margin * 2);
        const cellWidth = gridWidth / 7;
        const headerHeight = 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(gridX, gridY, gridWidth, headerHeight, 'F');
        
        weekdays.forEach((day, i) => {
            doc.text(day, gridX + i * cellWidth + cellWidth / 2, gridY + headerHeight / 2, { align: 'center', baseline: 'middle' });
        });

        // Calendar Grid
        const monthStart = startOfMonth(currentMonthDate);
        const monthEnd = endOfMonth(currentMonthDate);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);
        const daysInGrid = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        const gridContentY = gridY + headerHeight;
        const gridContentHeight = pageHeight - gridContentY - (margin + 20);
        const numWeeks = Math.ceil(daysInGrid.length / 7);
        const cellHeight = gridContentHeight / numWeeks;

        daysInGrid.forEach((day, i) => {
            const row = Math.floor(i / 7);
            const col = i % 7;
            const cellX = gridX + col * cellWidth;
            const cellY = gridContentY + row * cellHeight;

            // Cell border
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.rect(cellX, cellY, cellWidth, cellHeight, 'S');

            // Date number
            const isCurrent = getMonth(day) === getMonth(currentMonthDate);
            doc.setFontSize(9);
            doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
            doc.setTextColor(isCurrent ? '#000' : '#94a3b8'); // black or slate-400
            doc.text(format(day, 'd'), cellX + 5, cellY + 10);
            
            // Post content
            const dateKey = format(day, 'yyyy-MM-dd');
            const post = calendar.calendarData[dateKey];
            if (post) {
                const textY = cellY + 25;
                const lineSpacing = 10;
                const padding = 5;

                // Theme color indicator
                if (post.color !== 'transparent') {
                    doc.setFillColor(post.color);
                    doc.rect(cellX + 2, cellY + 2, 3, cellHeight - 4, 'F');
                }

                // Status
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor('#475569'); // slate-600
                const statusColor = statusColorMap[post.status] || '#cbd5e1';
                doc.setFillColor(statusColor);
                doc.circle(cellX + padding + 5, textY - 3, 3, 'F');
                doc.text(post.status, cellX + padding + 10, textY);

                // Title
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor('#1e293b'); // slate-800
                const titleLines = doc.splitTextToSize(post.title, cellWidth - padding * 2 - 8);
                doc.text(titleLines, cellX + padding, textY + lineSpacing);

                // Post Types
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                const typesText = post.types.join(', ');
                const typeLines = doc.splitTextToSize(typesText, cellWidth - padding * 2);
                doc.text(typeLines, cellX + padding, textY + lineSpacing * (1 + titleLines.length));

                // Platform icons at the bottom
                const iconSize = 10;
                const iconPadding = 3;
                let iconX = cellX + cellWidth - padding - (post.platforms.length * (iconSize + iconPadding));
                const iconY = cellY + cellHeight - padding - iconSize;
                
                post.platforms.slice(0, 4).forEach(platform => {
                    const iconPng = iconPngCache[platform.trim()];
                    if(iconPng){
                       doc.addImage(iconPng, 'PNG', iconX, iconY, iconSize, iconSize);
                       iconX += iconSize + iconPadding;
                    }
                });
            }
        });

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#64748b'); // slate-500
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - margin + 10, { align: 'right' });
    }

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