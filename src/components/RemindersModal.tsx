'use client';
import * as React from 'react';
import { format, addDays, startOfToday, eachDayOfInterval, isSameDay } from 'date-fns';
import { useProject } from '@/context/ProjectContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { Post, Project } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Bell, Calendar, Check, Edit, FileX, Info, Redo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarPicker } from './ui/calendar';
import { cn } from '@/lib/utils';
import { POST_STATUSES } from '@/lib/types';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface ReminderPost extends Post {
    date: string;
    projectId: string;
    calendarId: string;
}

interface RemindersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RemindersModal({ isOpen, onClose }: RemindersModalProps) {
    const { projects, allProjectData, activeAccount, getProjectById, updatePostInProject, movePostInProject } = useProject();
    const [upcomingPosts, setUpcomingPosts] = React.useState<ReminderPost[]>([]);
    const [missedPosts, setMissedPosts] = React.useState<ReminderPost[]>([]);

    React.useEffect(() => {
        if (!isOpen || !activeAccount) {
            setUpcomingPosts([]);
            setMissedPosts([]);
            return;
        };

        const today = startOfToday();
        const nextWeek = addDays(today, 7);
        
        const upcoming: ReminderPost[] = [];
        const missed: ReminderPost[] = [];
        
        const accountProjects = projects.filter(p => p.accountId === activeAccount.id);

        for (const project of accountProjects) {
            const projectData = (allProjectData as Map<string, any>).get(project.id);
            if (!projectData || !projectData.calendars) continue;

            for (const calendar of projectData.calendars) {
                if (!calendar.calendarData) continue;
                for (const dateStr in calendar.calendarData) {
                    const post = calendar.calendarData[dateStr];
                    const postDate = new Date(dateStr + 'T00:00:00');

                    if (post.status === 'Planned' && postDate >= today && postDate < nextWeek) {
                        upcoming.push({ ...post, date: dateStr, projectId: project.id, calendarId: calendar.id });
                    }
                    if (post.status === 'Missed') {
                        missed.push({ ...post, date: dateStr, projectId: project.id, calendarId: calendar.id });
                    }
                }
            }
        }
        
        setUpcomingPosts(upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setMissedPosts(missed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }, [isOpen, projects, allProjectData, activeAccount]);


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-8">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Bell className="h-6 w-6" />
                        Reminders
                    </DialogTitle>
                    <DialogDescription>
                        A summary of your upcoming and missed posts for the week.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="upcoming" className="flex-grow flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upcoming">
                            Upcoming Posts 
                            <Badge variant="secondary" className="ml-2">{upcomingPosts.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="missed">
                            Missed Posts
                            <Badge variant={missedPosts.length > 0 ? "destructive" : "secondary"} className="ml-2">{missedPosts.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming" className="flex-grow overflow-hidden mt-4">
                       <PostsGrid posts={upcomingPosts} getProjectById={getProjectById} updatePostInProject={updatePostInProject} movePostInProject={movePostInProject} isUpcoming />
                    </TabsContent>
                    <TabsContent value="missed" className="flex-grow overflow-hidden mt-4">
                        <PostsGrid posts={missedPosts} getProjectById={getProjectById} updatePostInProject={updatePostInProject} movePostInProject={movePostInProject} />
                    </TabsContent>
                </Tabs>
                 <DialogFooter className="pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


interface PostsGridProps {
    posts: ReminderPost[];
    getProjectById: (id: string) => Project | undefined;
    updatePostInProject: (projectId: string, calendarId: string, date: string, postData: Partial<Post>) => void;
    movePostInProject: (projectId: string, calendarId: string, sourceDate: string, destinationDate: string) => void;
    isUpcoming?: boolean;
}

function PostsGrid({ posts, getProjectById, updatePostInProject, movePostInProject, isUpcoming = false }: PostsGridProps) {
     if (posts.length === 0) {
        return (
            <div className="text-center py-20 h-full flex flex-col items-center justify-center">
                <Check className="mx-auto h-16 w-16 text-green-500/50" strokeWidth="1" />
                <h3 className="mt-4 text-xl font-medium text-foreground">All Caught Up!</h3>
                <p className="mt-1 text-md text-muted-foreground">
                    You have no {isUpcoming ? 'upcoming' : 'missed'} posts.
                </p>
            </div>
        )
    }

    const groupedByProject = posts.reduce((acc, post) => {
        if (!acc[post.projectId]) {
            acc[post.projectId] = [];
        }
        acc[post.projectId].push(post);
        return acc;
    }, {} as Record<string, ReminderPost[]>);

    return (
        <ScrollArea className="h-full pr-4">
            <div className='space-y-6'>
                {Object.entries(groupedByProject).map(([projectId, projectPosts]) => (
                    <Card key={projectId}>
                        <CardHeader>
                            <CardTitle>{getProjectById(projectId)?.name || 'Unknown Project'}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectPosts.map(post => (
                                <PostCard key={`${post.projectId}-${post.calendarId}-${post.date}`} post={post} updatePostInProject={updatePostInProject} movePostInProject={movePostInProject} />
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    )
}

function PostCard({ post, updatePostInProject, movePostInProject }: { post: ReminderPost, updatePostInProject: PostsGridProps['updatePostInProject'], movePostInProject: PostsGridProps['movePostInProject'] }) {
    const [reason, setReason] = React.useState(post.missedReason || '');
    const [isAlertOpen, setAlertOpen] = React.useState(false);
    
    const availableStatuses = POST_STATUSES.filter(s => s !== 'Missed' && s !== 'Planned');
    
    const handleStatusUpdate = (newStatus: string) => {
        updatePostInProject(post.projectId, post.calendarId, post.date, { status: newStatus as Post['status'] });
    }

    const handleDateUpdate = (newDate: Date | undefined) => {
        if (!newDate) return;
        
        // This is complex because we need to move the post in the other project's data
        // For now, we will just update the status and let it be moved on next load
        // A more robust solution would involve a dedicated backend function.
        const newStatus = post.status === 'Missed' ? 'Planned' : post.status;
        updatePostInProject(post.projectId, post.calendarId, post.date, { status: newStatus });
    }

    const handleCloseMissed = () => {
        if (!reason.trim()) {
            setAlertOpen(true);
            return;
        }
        const updatedNotes = `${post.notes}\n\n**Missed Reason:** ${reason.trim()}`;
        updatePostInProject(post.projectId, post.calendarId, post.date, { notes: updatedNotes, status: 'Missed' });
    }
    
    const handleReschedule = (newDate: Date | undefined) => {
         if (!newDate) return;
         const newDateStr = format(newDate, 'yyyy-MM-dd');
         movePostInProject(post.projectId, post.calendarId, post.date, newDateStr);
    }

    return (
        <Card className={cn("flex flex-col", post.status === 'Missed' && 'bg-red-50 border-red-200')}>
            <CardHeader className="flex-row items-start justify-between pb-2">
                 <CardTitle className="text-lg font-bold flex-grow pr-4">{post.title}</CardTitle>
                 <Badge variant={post.status === 'Missed' ? 'destructive' : 'outline'}>{post.status}</Badge>
            </CardHeader>
            <CardContent className="flex-grow">
                 <div className="text-sm text-muted-foreground mb-4">
                    <p>Date: {format(new Date(post.date + 'T00:00:00'), 'EEE, MMM d')}</p>
                 </div>
                {post.status === 'Missed' ? (
                     <div className='space-y-2'>
                        <Label htmlFor={`reason-${post.date}`}>Reason for missing</Label>
                        <Textarea id={`reason-${post.date}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Awaiting client feedback..."/>
                        <div className='flex gap-2 justify-end'>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button size="sm" variant="outline"><Calendar className="mr-2 h-4 w-4"/> Edit Date</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarPicker mode="single" onSelect={handleReschedule} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Button size="sm" onClick={handleCloseMissed}><FileX className="mr-2 h-4 w-4"/> Close as Missed</Button>
                        </div>
                     </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Select onValueChange={handleStatusUpdate}>
                            <SelectTrigger>
                                <SelectValue placeholder="Update Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon"><Edit className="h-4 w-4"/></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <CalendarPicker mode="single" onSelect={handleDateUpdate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
            </CardContent>
            <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reason Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please provide a reason for closing this missed post. This helps with tracking.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setAlertOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
