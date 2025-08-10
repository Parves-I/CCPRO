'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Globe } from 'lucide-react';
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

export function LogsDashboard() {
    const { activeProject } = useProject();
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!activeProject) {
            setLogs([]);
            return;
        };

        setLoading(true);
        const logsRef = collection(db, 'projects', activeProject.id, 'logs');
        const q = query(logsRef, orderBy('timestamp', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Log));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching logs: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeProject]);

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue='item-1'>
            <AccordionItem value="item-1">
                <Card className='shadow-sm'>
                    <CardHeader className='p-4'>
                        <AccordionTrigger className='p-0'>
                            <div className='flex items-center gap-2'>
                                <History className="h-5 w-5" />
                                <CardTitle className='text-lg'>Change History</CardTitle>
                            </div>
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent>
                        <CardContent className="p-0">
                            <ScrollArea className="h-48">
                                <div className="p-4 pt-0 space-y-4">
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="flex items-center space-x-4">
                                                <Skeleton className="h-8 w-8 rounded-full" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-[250px]" />
                                                    <Skeleton className="h-4 w-[200px]" />
                                                </div>
                                            </div>
                                        ))
                                    ) : logs.length > 0 ? (
                                        logs.map((log) => (
                                            <div key={log.id} className="flex items-start gap-4">
                                                <div className="p-2 bg-muted rounded-full">
                                                   <Globe className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{log.changeDescription}</p>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>{format(new Date(log.timestamp.seconds * 1000), "PPP p")}</span>
                                                        <span>&bull;</span>
                                                        <span>IP: {log.ipAddress}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-8">No recent changes logged.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </Accordion>
    );
}
