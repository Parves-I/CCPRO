'use client';

import * as React from 'react';
import type { Project, ProjectData, Post, PostStatus, PostType, Calendar } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveProjectAndLog } from '@/app/actions';
import {nanoid} from 'nanoid';

interface Filters {
    status: PostStatus[];
    types: PostType[];
    platforms: string[];
}

interface ProjectContextType {
  initializing: boolean;
  loading: boolean;
  projects: Project[];
  activeProject: Project | null;
  activeProjectData: ProjectData | null;
  activeCalendar: Calendar | null;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string) => Promise<void>;
  updateProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveCalendar: (calendarId: string) => void;
  createCalendar: (name: string) => void;
  updateActiveCalendar: (data: Partial<Calendar>) => void;
  renameCalendar: (calendarId: string, newName: string) => void;
  deleteCalendar: (calendarId: string) => void;
  updatePost: (date: string, post: Post) => void;
  deletePost: (date: string) => void;
  movePost: (sourceDate: string, destinationDate: string) => void;
  saveProjectToDb: () => Promise<void>;
  importCalendarData: (data: Partial<Calendar>) => void;
}

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [activeProjectData, setActiveProjectData] = React.useState<ProjectData | null>(null);
  const [activeCalendar, setActiveCalendar] = React.useState<Calendar | null>(null);

  const [filters, setFilters] = React.useState<Filters>({
    status: [],
    types: [],
    platforms: [],
  });
  const { toast } = useToast();

  const projectsCollectionRef = collection(db, 'projects');

  const fetchProjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocs(projectsCollectionRef);
      const fetchedProjects = data.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Project)
      );
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch projects.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  React.useEffect(() => {
    const fetchProjectData = async () => {
      if (activeProject) {
        setLoading(true);
        setActiveProjectData(null);
        setActiveCalendar(null);
        try {
          const projectDocRef = doc(db, 'projects', activeProject.id);
          const projectDoc = await getDoc(projectDocRef);
          if (projectDoc.exists()) {
            let data = projectDoc.data() as ProjectData;
            
            // Migration for older data structure
            if (!data.calendars) {
              const oldData = projectDoc.data() as any;
              const migratedCalendar: Calendar = {
                id: nanoid(),
                name: 'Main Calendar',
                startDate: oldData.startDate || '',
                endDate: oldData.endDate || '',
                calendarData: oldData.calendarData || {},
              };
              data = {
                name: data.name,
                calendars: [migratedCalendar],
                activeCalendarId: migratedCalendar.id,
              }
            }
            if (data.calendars.length === 0) {
              const newCalendar: Calendar = {
                id: nanoid(),
                name: 'Main Calendar',
                startDate: '',
                endDate: '',
                calendarData: {},
              };
              data.calendars.push(newCalendar);
              data.activeCalendarId = newCalendar.id;
            }

            setActiveProjectData(data);
            const calendarToActivate = data.calendars.find(c => c.id === data.activeCalendarId) || data.calendars[0];
            setActiveCalendar(calendarToActivate);
            
          } else {
            const newCalendar: Calendar = {
              id: nanoid(),
              name: 'Main Calendar',
              startDate: '',
              endDate: '',
              calendarData: {},
            };
            const initialData: ProjectData = {
              name: activeProject.name,
              calendars: [newCalendar],
              activeCalendarId: newCalendar.id,
            };
            await setDoc(projectDocRef, initialData);
            setActiveProjectData(initialData);
            setActiveCalendar(newCalendar);
          }
        } catch (error) {
          console.error('Error fetching project data:', error);
          toast({
            title: 'Error',
            description: 'Failed to load project data.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      } else {
        setActiveProjectData(null);
        setActiveCalendar(null);
      }
    };
    fetchProjectData();
  }, [activeProject, toast]);

  const createProject = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
       const newCalendar: Calendar = {
        id: nanoid(),
        name: 'Main Calendar',
        startDate: '',
        endDate: '',
        calendarData: {},
      };
      const initialData: ProjectData = {
        name,
        calendars: [newCalendar],
        activeCalendarId: newCalendar.id,
      };
      const docRef = await addDoc(projectsCollectionRef, initialData);
      const newProject = { id: docRef.id, name };
      setProjects((prev) => [...prev, newProject]);
      setActiveProject(newProject);
      toast({ title: 'Success', description: `Project "${name}" created.` });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    const projectDoc = doc(db, 'projects', id);
    try {
      await updateDoc(projectDoc, { name });
      setProjects(prev => prev.map(p => p.id === id ? {...p, name} : p));
      if(activeProject?.id === id) {
        setActiveProject(prev => prev ? {...prev, name} : null);
        setActiveProjectData(prev => prev ? { ...prev, name } : null);
      }
      toast({ title: 'Success', description: 'Project updated.' });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

 const deleteProject = async (id: string) => {
    setLoading(true);
    try {
      const logsCollectionRef = collection(db, 'projects', id, 'logs');
      const logsSnapshot = await getDocs(logsCollectionRef);
      
      const batch = writeBatch(db);

      logsSnapshot.forEach((logDoc) => {
        batch.delete(logDoc.ref);
      });

      const projectDocRef = doc(db, 'projects', id);
      batch.delete(projectDocRef);

      await batch.commit();

      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      toast({ title: 'Success', description: 'Project and its logs deleted.' });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setActiveCalendar = (calendarId: string) => {
    if (!activeProjectData) return;
    const newActiveCalendar = activeProjectData.calendars.find(c => c.id === calendarId);
    if (newActiveCalendar) {
      setActiveCalendar(newActiveCalendar);
      setActiveProjectData(prev => prev ? { ...prev, activeCalendarId: calendarId } : null);
    }
  };

  const createCalendar = (name: string) => {
    if (!activeProjectData) return;
    const newCalendar: Calendar = {
      id: nanoid(),
      name,
      startDate: '',
      endDate: '',
      calendarData: {},
    };
    const updatedCalendars = [...activeProjectData.calendars, newCalendar];
    setActiveProjectData(prev => prev ? { ...prev, calendars: updatedCalendars, activeCalendarId: newCalendar.id } : null);
    setActiveCalendar(newCalendar);
    toast({ title: 'Calendar Created', description: `"${name}" has been added to the project.` });
  };

  const renameCalendar = (calendarId: string, newName: string) => {
    if (!activeProjectData) return;
    const updatedCalendars = activeProjectData.calendars.map(c => 
      c.id === calendarId ? { ...c, name: newName } : c
    );
    setActiveProjectData(prev => prev ? { ...prev, calendars: updatedCalendars } : null);
    if(activeCalendar?.id === calendarId) {
      setActiveCalendar(prev => prev ? {...prev, name: newName} : null);
    }
    toast({ title: 'Calendar Renamed', description: 'The calendar name has been updated.' });
  }

  const deleteCalendar = (calendarId: string) => {
    if (!activeProjectData || activeProjectData.calendars.length <= 1) {
      toast({ title: 'Cannot Delete', description: 'A project must have at least one calendar.', variant: 'destructive'});
      return;
    }

    const updatedCalendars = activeProjectData.calendars.filter(c => c.id !== calendarId);
    const newActiveCalendarId = activeProjectData.activeCalendarId === calendarId ? updatedCalendars[0].id : activeProjectData.activeCalendarId;
    
    setActiveProjectData(prev => prev ? { ...prev, calendars: updatedCalendars, activeCalendarId: newActiveCalendarId } : null);
    setActiveCalendar(updatedCalendars.find(c => c.id === newActiveCalendarId) || null);
    toast({ title: 'Calendar Deleted', description: 'The calendar has been removed from the project.' });
  }

  const updateActiveCalendar = (data: Partial<Calendar>) => {
    setActiveCalendar(prev => (prev ? { ...prev, ...data } : null));
    setActiveProjectData(prevData => {
      if (!prevData || !activeCalendar) return null;
      const updatedCalendars = prevData.calendars.map(c => 
        c.id === activeCalendar.id ? { ...c, ...data } : c
      );
      return { ...prevData, calendars: updatedCalendars };
    });
  };

  const updatePost = (date: string, post: Post) => {
    if (!activeCalendar) return;
    const newCalendarData = { ...activeCalendar.calendarData, [date]: post };
    updateActiveCalendar({ calendarData: newCalendarData });
  };

  const deletePost = (date: string) => {
    if (!activeCalendar) return;
    const newCalendarData = { ...activeCalendar.calendarData };
    delete newCalendarData[date];
    updateActiveCalendar({ calendarData: newCalendarData });
  };

  const movePost = (sourceDate: string, destinationDate: string) => {
    if (!activeCalendar) return;
    const newCalendarData = { ...activeCalendar.calendarData };
    const sourcePost = newCalendarData[sourceDate];
    const destinationPost = newCalendarData[destinationDate];

    if (!sourcePost) return; 
    
    delete newCalendarData[sourceDate];
    newCalendarData[destinationDate] = sourcePost;

    if (destinationPost) {
        newCalendarData[sourceDate] = destinationPost;
    }
    updateActiveCalendar({ calendarData: newCalendarData });
  };

  const saveProjectToDb = async () => {
    if (!activeProject || !activeProjectData || !activeCalendar) return;
    setLoading(true);
    try {
      // Find the calendar in the project data and update it
      const finalProjectData = {
        ...activeProjectData,
        calendars: activeProjectData.calendars.map(c => c.id === activeCalendar.id ? activeCalendar : c)
      }
      
      const result = await saveProjectAndLog(activeProject.id, finalProjectData, activeCalendar.name);
      if (result.success) {
        // Update the main project data state after a successful save
        setActiveProjectData(finalProjectData);
        toast({ title: 'Project Saved!', description: 'Your changes have been saved to the cloud.' });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to save project.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const importCalendarData = (data: Partial<Calendar>) => {
    if (!activeCalendar) {
        toast({ title: 'Error', description: 'No active calendar to import data into.', variant: 'destructive' });
        return;
    }
    const calendarData = data.calendarData || {};
    // Sanitize imported data to make sure it includes the status field
    for (const key in calendarData) {
        const post = calendarData[key];
        if (!post.status) {
            post.status = 'Planned';
        }
    }

    updateActiveCalendar({
      startDate: data.startDate,
      endDate: data.endDate,
      calendarData: calendarData,
    });
    toast({ title: 'Import Successful', description: 'Data has been loaded. Click "Save" to persist changes.' });
  }

  const value = {
    initializing,
    loading,
    projects,
    activeProject,
    activeProjectData,
    activeCalendar,
    filters,
    setFilters,
    setActiveProject,
    createProject,
    updateProject,
    deleteProject,
    setActiveCalendar,
    createCalendar,
    updateActiveCalendar,
    renameCalendar,
    deleteCalendar,
    updatePost,
    deletePost,
    movePost,
    saveProjectToDb,
    importCalendarData,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = React.useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
