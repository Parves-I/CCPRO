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
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Globe, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from './ui/skeleton';

interface Log {
    id: string;
    timestamp: {
        seconds: number;
        nanoseconds: number;
    };
    ipAddress: string;
    changeDescription: string;
}

interface ChangeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangeHistoryModal({ isOpen, onClose }: ChangeHistoryModalProps) {
    const { activeProject } = useProject();
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!isOpen || !activeProject) {
            if(!isOpen) setLogs([]);
            return;
        };

        setLoading(true);
        const logsRef = collection(db, 'projects', activeProject.id, 'logs');
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
    }, [activeProject, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <History className="h-6 w-6" />
                        Change History for {activeProject?.name}
                    </DialogTitle>
                    <DialogDescription>
                        A log of the last 50 saved changes for this project.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden -mx-6 px-6">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-6">
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
                                    <div key={log.id} className="flex items-start gap-4">
                                        <div className="p-2.5 bg-muted rounded-full mt-1">
                                           <Globe className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-md font-medium">{log.changeDescription}</p>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <span>{format(new Date(log.timestamp.seconds * 1000), "PPP p")}</span>
                                                <span>&bull;</span>
                                                <span>IP: {log.ipAddress}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <History className="mx-auto h-12 w-12 text-muted-foreground/30" strokeWidth="1" />
                                    <h3 className="mt-4 text-lg font-medium text-foreground">No History Found</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Once you save the project, the changes will be logged here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
