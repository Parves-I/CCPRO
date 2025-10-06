'use client';

import * as React from 'react';
import type { Project, ProjectData, Post, PostStatus, PostType, Calendar, Account } from '@/lib/types';
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
  query,
  where,
  collectionGroup,
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
  accounts: Account[];
  activeAccount: Account | null;
  projects: Project[];
  activeProject: Project | null;
  activeProjectData: ProjectData | null;
  activeCalendar: Calendar | null;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  createAccount: (name: string) => Promise<void>;
  renameAccount: (id: string, name: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setActiveAccount: (account: Account | null) => void;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string, accountId: string) => Promise<void>;
  updateProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  switchActiveCalendar: (calendarId: string) => void;
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
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = React.useState<Account | null>(null);
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

  const accountsCollectionRef = collection(db, 'accounts');

  // Fetch all accounts and projects on initial load
  const fetchInitialData = React.useCallback(async () => {
    setLoading(true);
    try {
        const accountsSnapshot = await getDocs(accountsCollectionRef);
        let fetchedAccounts = accountsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Account));

        // Migration logic
        if (fetchedAccounts.length === 0) {
            console.log("No accounts found, starting migration...");
            const tempAccount: Omit<Account, 'id'> = { name: 'Socials' };
            const accountDocRef = await addDoc(accountsCollectionRef, tempAccount);
            const newAccount = { id: accountDocRef.id, name: tempAccount.name };
            fetchedAccounts.push(newAccount);

            const oldProjectsSnapshot = await getDocs(collection(db, 'projects'));
            const batch = writeBatch(db);

            oldProjectsSnapshot.forEach(oldProjectDoc => {
                const projectData = oldProjectDoc.data() as any;
                const newProjectRef = doc(db, 'accounts', newAccount.id, 'projects', oldProjectDoc.id);

                // Preserve existing project data, add accountId
                 const newProjectData = {
                    ...projectData,
                    accountId: newAccount.id,
                };

                batch.set(newProjectRef, newProjectData);
                batch.delete(oldProjectDoc.ref); // Delete old project
            });
            await batch.commit();
            console.log("Migration completed.");
        }
        
        setAccounts(fetchedAccounts);
        const firstAccount = fetchedAccounts[0] || null;
        setActiveAccount(firstAccount);
        
        const projectsQuery = query(collectionGroup(db, 'projects'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const allProjects = projectsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
        setProjects(allProjects);

    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Effect to handle active account change
  React.useEffect(() => {
    setActiveProject(null);
    setActiveProjectData(null);
    setActiveCalendar(null);
  }, [activeAccount]);

  // Effect to fetch project data when active project changes
  React.useEffect(() => {
    const fetchProjectData = async () => {
      if (activeProject && activeAccount) {
        setLoading(true);
        setActiveProjectData(null);
        setActiveCalendar(null);
        try {
          const projectDocRef = doc(db, 'accounts', activeAccount.id, 'projects', activeProject.id);
          const projectDoc = await getDoc(projectDocRef);
          if (projectDoc.exists()) {
            let data = projectDoc.data() as ProjectData;
            
            if (!data.calendars || data.calendars.length === 0) {
              const newCalendar: Calendar = {
                id: nanoid(),
                name: 'Main Calendar',
                startDate: '',
                endDate: '',
                calendarData: {},
              };
              data.calendars = [newCalendar];
              data.activeCalendarId = newCalendar.id;
            }
            
            setActiveProjectData(data);
            const calendarToActivate = data.calendars.find(c => c.id === data.activeCalendarId) || data.calendars[0];
            setActiveCalendar(calendarToActivate);
            
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
  }, [activeProject, activeAccount, toast]);

  const createAccount = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
        const docRef = await addDoc(accountsCollectionRef, { name });
        const newAccount = { id: docRef.id, name };
        setAccounts(prev => [...prev, newAccount]);
        setActiveAccount(newAccount);
        toast({ title: 'Success', description: `Account "${name}" created.`});
    } catch (error) {
        console.error('Error creating account:', error);
        toast({ title: 'Error', description: 'Failed to create account.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }

  const renameAccount = async (id: string, name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    const accountDoc = doc(db, 'accounts', id);
    try {
        await updateDoc(accountDoc, { name });
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, name } : a));
        if (activeAccount?.id === id) {
            setActiveAccount(prev => prev ? { ...prev, name } : null);
        }
        toast({ title: 'Success', description: 'Account renamed.' });
    } catch (error) {
        console.error('Error renaming account:', error);
        toast({ title: 'Error', description: 'Failed to rename account.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }
  
  const deleteAccount = async (id: string) => {
    setLoading(true);
    try {
        const projectsQuery = query(collection(db, 'accounts', id, 'projects'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const batch = writeBatch(db);

        // Delete all projects and their logs within the account
        for (const projectDoc of projectsSnapshot.docs) {
            const logsRef = collection(db, 'accounts', id, 'projects', projectDoc.id, 'logs');
            const logsSnapshot = await getDocs(logsRef);
            logsSnapshot.forEach(logDoc => batch.delete(logDoc.ref));
            batch.delete(projectDoc.ref);
        }

        // Delete the account document itself
        batch.delete(doc(db, 'accounts', id));
        
        await batch.commit();

        setAccounts(prev => prev.filter(a => a.id !== id));
        if (activeAccount?.id === id) {
            setActiveAccount(accounts.length > 1 ? accounts.find(a => a.id !== id) || null : null);
        }
        setProjects(prev => prev.filter(p => p.accountId !== id));
        toast({ title: 'Success', description: 'Account and all its projects deleted.' });

    } catch (error) {
        console.error('Error deleting account:', error);
        toast({ title: 'Error', description: 'Failed to delete account.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };


  const createProject = async (name: string, accountId: string) => {
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
      const projectCollectionRef = collection(db, 'accounts', accountId, 'projects');
      const docRef = await addDoc(projectCollectionRef, initialData);
      const newProject = { id: docRef.id, name, accountId };
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
    if (!name.trim() || !activeAccount) return;
    setLoading(true);
    const projectDoc = doc(db, 'accounts', activeAccount.id, 'projects', id);
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
    if (!activeAccount) return;
    setLoading(true);
    try {
      const projectDocRef = doc(db, 'accounts', activeAccount.id, 'projects', id);
      const logsCollectionRef = collection(db, 'accounts', activeAccount.id, 'projects', id, 'logs');
      const logsSnapshot = await getDocs(logsCollectionRef);
      
      const batch = writeBatch(db);

      logsSnapshot.forEach((logDoc) => {
        batch.delete(logDoc.ref);
      });

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

  const switchActiveCalendar = (calendarId: string) => {
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
    if (!activeProject || !activeProjectData || !activeCalendar || !activeAccount) return;
    setLoading(true);
    try {
      const finalProjectData = {
        name: activeProjectData.name,
        calendars: activeProjectData.calendars.map(c => c.id === activeCalendar.id ? activeCalendar : c),
        activeCalendarId: activeProjectData.activeCalendarId,
      };

      const projectRef = doc(db, 'accounts', activeAccount.id, 'projects', activeProject.id);
      
      const batch = writeBatch(db);
      batch.set(projectRef, finalProjectData);
      
      // We are not using server actions anymore for this part
      const logsCollectionRef = collection(db, 'accounts', activeAccount.id, 'projects', activeProject.id, 'logs');
      const ip = 'Unknown'; // Can't get IP on client side easily
      const logEntry = {
        timestamp: new Date(),
        ipAddress: ip,
        changeDescription: `Project "${activeProjectData.name}" (Calendar: ${activeCalendar.name}) was saved.`,
      };
      batch.set(doc(logsCollectionRef), logEntry);
      
      await batch.commit();

      setActiveProjectData(finalProjectData);
      toast({ title: 'Project Saved!', description: 'Your changes have been saved to the cloud.' });

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
      name: data.name || activeCalendar.name,
      startDate: data.startDate,
      endDate: data.endDate,
      calendarData: calendarData,
    });
    toast({ title: 'Import Successful', description: 'Data has been loaded. Click "Save" to persist changes.' });
  }

  const value = {
    initializing,
    loading,
    accounts,
    activeAccount,
    projects,
    activeProject,
    activeProjectData,
    activeCalendar,
    filters,
    setFilters,
    createAccount,
    renameAccount,
    deleteAccount,
    setActiveAccount,
    setActiveProject,
    createProject,
    updateProject,
    deleteProject,
    switchActiveCalendar,
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
