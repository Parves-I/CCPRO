'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { utils, writeFile } from 'xlsx';
import type { Calendar, Project, Post, Platform } from './types';
import { format } from 'date-fns';
import { InstagramIcon, YouTubeIcon, LinkedInIcon, FacebookIcon, WebsiteIcon, OtherPlatformIcon } from '@/components/icons';


// Augment jsPDF with the autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const platformIconMap: Record<string, string> = {
    Instagram: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ig" r="150%" cx="30%" cy="107%"><stop stop-color="#fdf497" offset="0"/><stop stop-color="#fd5949" offset=".45"/><stop stop-color="#d6249f" offset=".6"/><stop stop-color="#285AEB" offset=".9"/></radialGradient></defs><path fill="url(#ig)" d="m12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.441c-3.117 0-3.483.011-4.71.068-2.77.127-3.978 1.342-4.104 4.104-.057 1.228-.067 1.583-.067 4.71s.01 3.482.067 4.71c.127 2.76 1.334 3.977 4.104 4.104 1.227.056 1.592.067 4.71.067s3.483-.011 4.71-.067c2.77-.127 3.978-1.342 4.104-4.104.057-1.228.067-1.583.067-4.71s-.01-3.482-.067-4.71c-.127-2.76-1.334-3.977-4.104-4.104-1.227-.056-1.592-.067-4.71-.067zm0 3.462c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 8.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5zm4.862-9.638c-.795 0-1.441.646-1.441 1.441s.646 1.441 1.441 1.441 1.441-.646 1.441-1.441-.646-1.441-1.441-1.441z"/></svg>`,
    YouTube: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#FF0000" d="M21.582 7.373c-.227-.813-.88-1.465-1.693-1.693-1.49-.402-7.889-.402-7.889-.402s-6.399 0-7.889.402c-.813.228-1.465.88-1.693 1.693-.402 1.49-.402 4.627-.402 4.627s0 3.137.402 4.627c.228.813.88 1.465 1.693 1.693 1.49.402 7.889.402 7.889.402s6.399 0 7.889-.402c.813-.228 1.465-.88 1.693-1.693.402-1.49.402-4.627.402-4.627s0-3.137-.402-4.627zM9.546 15.454V8.546l6.21 3.454-6.21 3.454z" /></svg>`,
    LinkedIn: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 11-4.125 0 2.062 2.062 0 014.125 0zM7.15 20.452H3.552V9h3.598v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" /></svg>`,
    Facebook: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#1877F2" d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.35C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.732 0 1.325-.593 1.325-1.325V1.325C24 .593 23.407 0 22.675 0z" /></svg>`,
    Website: `<svg fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m0 0a9 9 0 019-9m-9 9a9 9 0 009 9"/></svg>`,
    Other: `<svg fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
};

export const exportToPDF = (project: Project | null, calendar: Calendar | null) => {
  if (!project || !calendar) {
    alert('Project and calendar data are required.');
    return;
  }
  
  if (Object.keys(calendar.calendarData).length === 0) {
    alert('No content to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4',
  });

  const primaryColor = '#4f46e5'; // Indigo-600
  const textColor = '#111827'; // Gray-900
  const secondaryTextColor = '#6b7280'; // Gray-500
  const pageMargin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // --- Header ---
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Content Calendar', pageMargin, 60);

  doc.setFontSize(14);
  doc.setTextColor(textColor);
  doc.text(project.name, pageMargin, 80);

  doc.setFontSize(12);
  doc.setTextColor(secondaryTextColor);
  doc.setFont('helvetica', 'normal');
  doc.text(calendar.name, pageMargin, 95);
  
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1.5);
  doc.line(pageMargin, 105, pageWidth - pageMargin, 105);

  // --- Table Content ---
  const sortedPosts = Object.entries(calendar.calendarData)
    .map(([date, post]) => ({ date, ...post }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const tableData = sortedPosts.map(post => {
      const formattedDate = format(new Date(post.date + 'T00:00:00'), 'MMM dd, yyyy');
      return [
        { content: `${formattedDate}\n${post.status}`, styles: { cellWidth: 65, valign: 'middle' } },
        { content: post.title, styles: { cellWidth: 'auto', valign: 'middle', fontStyle: 'bold' } },
        { content: post.types.join(', '), styles: { cellWidth: 70, valign: 'middle' } },
        { content: post.platforms, styles: { cellWidth: 80, valign: 'middle'} } // Placeholder
      ];
  });
  
  doc.autoTable({
    startY: 125,
    head: [['Date', 'Title', 'Type', 'Platforms']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: '#ffffff',
      fontSize: 11,
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: textColor,
      cellPadding: 8,
      lineWidth: 0.5,
      lineColor: '#e5e7eb', // Gray-200
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
        // Platform icons column
        if (data.column.index === 3 && data.cell.section === 'body') {
            const platforms = data.cell.raw as string[];
            const iconSize = 14;
            const iconPadding = 2;
            let x = data.cell.x + iconPadding;
            const y = data.cell.y + (data.cell.height - iconSize) / 2; // Center vertically

            platforms.slice(0, 4).forEach(platform => {
                const iconSVG = platformIconMap[platform];
                if (iconSVG) {
                    // Use a library or method to draw SVG if jspdf doesn't support it directly
                    // As a workaround, we are drawing a shape.
                    try {
                        doc.svg(iconSVG, { x, y, width: iconSize, height: iconSize });
                    } catch(e) {
                      console.error("Error drawing SVG:", e);
                      // Fallback for icons
                      doc.setFontSize(8);
                      doc.text(platform.substring(0,2), x, y + iconSize/2);
                    }
                    x += iconSize + iconPadding;
                }
            });
        }
    },
  });


  // --- Footer ---
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(secondaryTextColor);
    const dateText = `Exported on: ${format(new Date(), 'MMM dd, yyyy')}`;
    const pageText = `Page ${i} of ${pageCount}`;
    
    doc.text(dateText, pageMargin, doc.internal.pageSize.getHeight() - 20);
    doc.text(pageText, doc.internal.pageSize.getWidth() - pageMargin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }


  doc.save(`${project.name}-${calendar.name}-export.pdf`);
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
