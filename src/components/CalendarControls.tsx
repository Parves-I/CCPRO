'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Save, Upload, FileDown, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportToPDF, exportToExcel, exportToFile } from '@/lib/export';
import type { ProjectData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';

export function CalendarControls() {
  const { activeProject, activeProjectData, updateActiveProjectData, saveProjectToDb, importProjectData, loading } = useProject();
  const calendarGridRef = React.useRef<HTMLElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  
  React.useEffect(() => {
    // A bit of a hack to get the calendar grid element for PDF export
    calendarGridRef.current = document.getElementById('calendar-grid');
  }, [activeProjectData]);

  const startDate = activeProjectData?.startDate ? new Date(activeProjectData.startDate) : undefined;
  const endDate = activeProjectData?.endDate ? new Date(activeProjectData.endDate) : undefined;
  
  const handleDateChange = (field: 'startDate' | 'endDate', value?: Date) => {
    if (value) {
      updateActiveProjectData({ [field]: format(value, 'yyyy-MM-dd') });
    }
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File content is not valid text.');
        }
        const data = JSON.parse(text) as Partial<ProjectData>;

        // Basic validation
        if (!data.calendarData || data.startDate === undefined || data.endDate === undefined) {
             throw new Error('Invalid .ccpro file format.');
        }

        const importedData: ProjectData = {
          name: data.name || activeProject?.name || 'Untitled Project',
          startDate: data.startDate,
          endDate: data.endDate,
          calendarData: data.calendarData,
        };

        importProjectData(importedData);
      } catch (error) {
        console.error('Failed to import file:', error);
        toast({
          title: 'Import Failed',
          description: (error as Error).message || 'Please check the file and try again.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className='w-full sm:w-auto'>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={'outline'}
                        className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Start date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => handleDateChange('startDate', date)}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
             <div className='w-full sm:w-auto'>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={'outline'}
                        className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span>End date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => handleDateChange('endDate', date)}
                        disabled={{ before: startDate }}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
             </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
            <input type="file" ref={fileInputRef} className='hidden' accept=".ccpro" onChange={handleFileImport} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} title="Import from .ccpro file">
                <Upload className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Import</span>
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" title="Export options">
                        <Download className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-2">Export</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => exportToPDF(calendarGridRef.current)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => activeProjectData && exportToExcel(activeProjectData)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => activeProjectData && exportToFile(activeProjectData)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export as .ccpro
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={saveProjectToDb} disabled={loading} title="Save project to cloud">
                {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only sm:ml-2">Save</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
