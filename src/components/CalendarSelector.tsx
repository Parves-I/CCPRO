'use client'

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

import { ChevronsUpDown, Check, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function CalendarSelector() {
    const { activeProjectData, activeCalendar, setActiveCalendar, renameCalendar, deleteCalendar, loading } = useProject();
    const [open, setOpen] = React.useState(false);
    const [isEditOpen, setEditOpen] = React.useState(false);
    const [isDeleteOpen, setDeleteOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const { toast } = useToast();
    
    React.useEffect(() => {
        if(activeCalendar) {
            setName(activeCalendar.name)
        }
    }, [activeCalendar, isEditOpen]);

    if (!activeProjectData || !activeCalendar) return null;

    const handleRename = () => {
        if(!name.trim()) {
            toast({ title: 'Error', description: 'Calendar name cannot be empty.', variant: 'destructive'});
            return;
        }
        renameCalendar(activeCalendar.id, name.trim());
        setEditOpen(false);
    }

    const handleDelete = () => {
        deleteCalendar(activeCalendar.id);
        setDeleteOpen(false);
    }
    
    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    {activeCalendar.name}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search calendars..." />
                        <CommandList>
                            <CommandEmpty>No calendars found.</CommandEmpty>
                            <CommandGroup>
                                {activeProjectData.calendars.map((calendar) => (
                                <CommandItem
                                    key={calendar.id}
                                    value={calendar.name}
                                    onSelect={() => {
                                        setActiveCalendar(calendar.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            activeCalendar.id === calendar.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {calendar.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Rename Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Calendar</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='rename-calendar-name'>Calendar Name</Label>
                        <Input id='rename-calendar-name' value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={loading}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this calendar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{activeCalendar.name}" calendar and all its data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
