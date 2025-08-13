'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { utils, writeFile } from 'xlsx';
import type { Calendar } from './types';

export const exportToPDF = async (calendarElement: HTMLElement | null) => {
  if (!calendarElement) {
    alert('Calendar element not found.');
    return;
  }
  
  try {
    const canvas = await html2canvas(calendarElement, { scale: 2, useCORS: true, backgroundColor: null });
    const imgData = canvas.toDataURL('image/png');
    
    // Use a fixed aspect ratio for landscape A4 paper for consistency
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasAspectRatio = canvas.width / canvas.height;
    const pdfAspectRatio = pdfWidth / pdfHeight;

    let finalWidth, finalHeight;

    if (canvasAspectRatio > pdfAspectRatio) {
      finalWidth = pdfWidth;
      finalHeight = pdfWidth / canvasAspectRatio;
    } else {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * canvasAspectRatio;
    }
    
    // Center the image
    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save('collabcal-export.pdf');
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('An error occurred while exporting to PDF.');
  }
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
