'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import type { ProjectData } from '@/lib/types';

interface Log {
    id: string;
    timestamp: {
        seconds: number;
        nanoseconds: number;
    };
    ipAddress: string;
    changeDescription: string;
    snapshot: ProjectData;
    author?: string;
}

interface ChangeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangeHistoryModal({ isOpen, onClose }: ChangeHistoryModalProps) {
    const { activeAccount, activeProject } = useProject();
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Fetch logs specifically for the active project
    React.useEffect(() => {
        // Clear logs if project changes or modal closes
        if (!isOpen || !activeProject || !activeAccount) {
            setLogs([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const logsRef = collection(db, 'accounts', activeAccount.id, 'projects', activeProject.id, 'logs');
        const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Log));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching logs: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeAccount, activeProject?.id, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[75vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <History className="h-6 w-6" />
                        History for {activeProject?.name}
                    </DialogTitle>
                    <DialogDescription>
                        Last 50 saves.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden -mx-6 px-6">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-6 py-4">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[300px]" />
                                            <Skeleton className="h-4 w-[250px]" />
                                        </div>
                                    </div>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <div key={log.id} className="flex items-start justify-between gap-4 border-b pb-4 last:border-0">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-muted rounded-full mt-1">
                                               <Globe className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-md font-medium">{log.changeDescription}</p>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                    <span>{log.timestamp ? format(new Date(log.timestamp.seconds * 1000), "PPP p") : 'Recently'}</span>
                                                    <span>&bull;</span>
                                                    <span>{log.author || 'User'}</span>
                                                    <span>&bull;</span>
                                                    <span>IP: {log.ipAddress}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <History className="mx-auto h-12 w-12 text-muted-foreground/30" strokeWidth="1" />
                                    <h3 className="mt-4 text-lg font-medium text-foreground">No History</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Save the project to see its history here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
