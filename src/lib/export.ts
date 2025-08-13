'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { utils, writeFile } from 'xlsx';
import type { Calendar } from './types';
import { format } from 'date-fns';

export const exportToPDF = async (calendarElement: HTMLElement, projectName: string, calendarName: string) => {
  if (!calendarElement) {
    alert('Calendar element not found.');
    return;
  }
  
  // Temporarily add a white background to the body for the canvas rendering
  // to ensure components with transparent backgrounds are rendered correctly.
  const originalBodyColor = document.body.style.backgroundColor;
  document.body.style.backgroundColor = 'white';

  try {
    const canvas = await html2canvas(calendarElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Find the calendar element in the cloned document and ensure it's visible
        const clonedCalendar = document.getElementById('calendar-grid');
        if (clonedCalendar) {
          // You can apply styles to the cloned document if needed
        }
      }
    });
    
    document.body.style.backgroundColor = originalBodyColor;

    const imgData = canvas.toDataURL('image/png');
    
    // Use a fixed aspect ratio for landscape A4 paper for consistency
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;

    // Header
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${projectName} - ${calendarName}`, margin, margin);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Exported on: ${format(new Date(), 'PPP')}`, margin, margin + 20);

    // Image
    const canvasAspectRatio = canvas.width / canvas.height;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = pdfHeight - (margin + 40) * 2; // Extra top margin for header
    
    let finalWidth, finalHeight;

    if (canvas.width > contentWidth || canvas.height > contentHeight) {
      if (canvasAspectRatio > (contentWidth / contentHeight)) {
        finalWidth = contentWidth;
        finalHeight = finalWidth / canvasAspectRatio;
      } else {
        finalHeight = contentHeight;
        finalWidth = finalHeight * canvasAspectRatio;
      }
    } else {
      finalWidth = canvas.width;
      finalHeight = canvas.height;
    }
    
    // Center the image
    const x = (pdfWidth - finalWidth) / 2;
    const y = margin + 40;

    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    pdf.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.text(
            `Page ${i} of ${pageCount}`,
            pdfWidth - margin,
            pdfHeight - margin + 10,
            { align: 'right' }
        );
    }
    
    pdf.save(`${projectName.replace(/\s+/g, '-')}-${calendarName.replace(/\s+/g, '-')}.pdf`);

  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('An error occurred while exporting to PDF.');
    document.body.style.backgroundColor = originalBodyColor;
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
