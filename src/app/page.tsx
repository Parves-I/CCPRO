'use client';

import * as React from 'react';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { CalendarControls } from '@/components/CalendarControls';
import { CalendarGrid } from '@/components/CalendarGrid';
import { useProject } from '@/context/ProjectContext';
import { FilterControls } from '@/components/FilterControls';
import { Card } from '@/components/ui/card';

export default function Home() {
  const { loading, activeProject, activeProjectData, initializing } = useProject();

  const MainContent = () => {
    if (initializing) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Initializing CollabCal...</p>
        </div>
      );
    }

    if (!activeProject) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Welcome to CollabCal</h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-lg">
            Your all-in-one content planning and workflow solution. Create a new project or select an existing one to get started.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className='flex items-center gap-4'>
             <div className="md:hidden">
                <SidebarTrigger />
             </div>
            <h1 className="text-3xl font-bold text-foreground">{activeProject.name}</h1>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </header>
        <Card className="p-4 mb-6 shadow-sm">
          <CalendarControls />
          <FilterControls />
        </Card>
        <div className='flex flex-col flex-grow min-h-0'>
          <Card className="flex-grow p-4 sm:p-6 shadow-sm overflow-auto">
            {activeProjectData?.startDate && activeProjectData?.endDate ? (
              <CalendarGrid />
            ) : (
              <div className="text-center py-20 h-full flex flex-col items-center justify-center">
                <CalendarIcon className="mx-auto h-16 w-16 text-muted-foreground/30" strokeWidth="1" />
                <h3 className="mt-4 text-xl font-medium text-foreground">Your Calendar Awaits</h3>
                <p className="mt-1 text-md text-muted-foreground">
                  Select a start and end date to begin planning your content.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };
  
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                CCPRO
              </h1>
              <a href="https://www.wedefinenet.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
                  Powered by We Define Net
              </a>
            </div>
            <div className="md:hidden">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </SidebarTrigger>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <ProjectSidebar />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-body-background">
        <main className="min-h-screen max-h-screen flex flex-col">
          <MainContent />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
