'use client';

import * as React from 'react';
import type { Project, ProjectData, CalendarData, Post } from '@/lib/types';
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ProjectContextType {
  initializing: boolean;
  loading: boolean;
  projects: Project[];
  activeProject: Project | null;
  activeProjectData: ProjectData | null;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string) => Promise<void>;
  updateProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateActiveProjectData: (data: Partial<ProjectData>) => void;
  updatePost: (date: string, post: Post) => void;
  deletePost: (date: string) => void;
  saveProjectToDb: () => Promise<void>;
  importProjectData: (data: ProjectData) => void;
}

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [activeProjectData, setActiveProjectData] = React.useState<ProjectData | null>(null);
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
        try {
          const projectDocRef = doc(db, 'projects', activeProject.id);
          const projectDoc = await getDoc(projectDocRef);
          if (projectDoc.exists()) {
            setActiveProjectData(projectDoc.data() as ProjectData);
          } else {
             // If data doesn't exist, create initial structure
            const initialData: ProjectData = {
              name: activeProject.name,
              startDate: '',
              endDate: '',
              calendarData: {},
            };
            await setDoc(projectDocRef, initialData);
            setActiveProjectData(initialData);
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
      }
    };
    fetchProjectData();
  }, [activeProject, toast]);

  const createProject = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const docRef = await addDoc(projectsCollectionRef, { name });
      const newProject = { id: docRef.id, name };
      await setDoc(doc(db, 'projects', docRef.id), {
        name,
        startDate: '',
        endDate: '',
        calendarData: {},
      });
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
      await fetchProjects();
      if(activeProject?.id === id) {
        setActiveProject(prev => prev ? {...prev, name} : null);
        updateActiveProjectData({ name });
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
    const projectDoc = doc(db, 'projects', id);
    try {
      await deleteDoc(projectDoc);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      toast({ title: 'Success', description: 'Project deleted.' });
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

  const updateActiveProjectData = (data: Partial<ProjectData>) => {
    setActiveProjectData((prev) => (prev ? { ...prev, ...data } : null));
  };
  
  const updatePost = (date: string, post: Post) => {
    setActiveProjectData(prev => {
        if (!prev) return null;
        const newCalendarData = { ...prev.calendarData, [date]: post };
        return { ...prev, calendarData: newCalendarData };
    });
  };

  const deletePost = (date: string) => {
    setActiveProjectData(prev => {
        if (!prev) return null;
        const newCalendarData = { ...prev.calendarData };
        delete newCalendarData[date];
        return { ...prev, calendarData: newCalendarData };
    });
  };

  const saveProjectToDb = async () => {
    if (!activeProject || !activeProjectData) return;
    setLoading(true);
    const projectDoc = doc(db, 'projects', activeProject.id);
    try {
      await setDoc(projectDoc, activeProjectData);
      toast({ title: 'Project Saved!', description: 'Your changes have been saved to the cloud.' });
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const importProjectData = (data: ProjectData) => {
    if (!activeProject) {
        toast({ title: 'Error', description: 'No active project to import data into.', variant: 'destructive' });
        return;
    }
    setActiveProjectData(data);
    toast({ title: 'Import Successful', description: 'Data has been loaded. Click "Save" to persist changes.' });
  }

  const value = {
    initializing,
    loading,
    projects,
    activeProject,
    activeProjectData,
    setActiveProject,
    createProject,
    updateProject,
    deleteProject,
    updateActiveProjectData,
    updatePost,
    deletePost,
    saveProjectToDb,
    importProjectData,
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
