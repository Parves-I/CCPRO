'use client';

import * as React from 'react';
import type { Project, ProjectData, Post, PostStatus, PostType, Calendar, Teammate } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  onSnapshot,
  collectionGroup,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {nanoid} from 'nanoid';
import { isPast, format, startOfToday } from 'date-fns';

const LAST_TEAMMATE_ID_KEY = 'collabcal-last-teammate-id';

interface Filters {
    status: PostStatus[];
    types: PostType[];
    platforms: string[];
}

interface ProjectContextType {
  initializing: boolean;
  loading: boolean;
  teammates: Teammate[];
  activeTeammate: Teammate | null;
  projects: Project[];
  activeProject: Project | null;
  activeProjectData: ProjectData | null;
  activeCalendar: Calendar | null;
  filters: Filters;
  allProjectData: Map<string, ProjectData>;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  createTeammate: (name: string) => Promise<void>;
  renameTeammate: (id: string, name: string) => Promise<void>;
  deleteTeammate: (id: string) => Promise<void>;
  setActiveTeammate: (teammate: Teammate | null) => void;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string, accountId: string) => Promise<void>;
  updateProject: (id: string, name: string, accountId: string) => Promise<void>;
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
  updatePostInProject: (projectId: string, calendarId: string, date: string, postData: Partial<Post>) => void;
  movePostInProject: (projectId: string, calendarId: string, sourceDate: string, destinationDate: string) => void;
  getProjectById: (projectId: string) => Project | undefined;
}

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [teammates, setTeammates] = React.useState<Teammate[]>([]);
  const [activeTeammate, setActiveTeammate] = React.useState<Teammate | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [allProjectData, setAllProjectData] = React.useState<Map<string, ProjectData>>(new Map());
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [activeProjectData, setActiveProjectData] = React.useState<ProjectData | null>(null);
  const [activeCalendar, setActiveCalendar] = React.useState<Calendar | null>(null);
  const [isModalClosing, setIsModalClosing] = React.useState(false);

  const [filters, setFilters] = React.useState<Filters>({
    status: [],
    types: [],
    platforms: [],
  });
  const { toast } = useToast();

  const accountsCollectionRef = collection(db, 'accounts');

  // Initial data fetch and listeners setup
  React.useEffect(() => {
    setInitializing(true);
    const lastUsedTeammateId = localStorage.getItem(LAST_TEAMMATE_ID_KEY);

    const unsubscribeAccounts = onSnapshot(accountsCollectionRef, 
      (snapshot) => {
        const fetchedTeammates = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Teammate));
        setTeammates(fetchedTeammates);
        
        if (fetchedTeammates.length > 0) {
            const teammateToSet = lastUsedTeammateId 
                ? (fetchedTeammates.find(a => a.id === lastUsedTeammateId) || null)
                : null;
            
            if (activeTeammate?.id !== teammateToSet?.id) {
                setActiveTeammate(teammateToSet);
            }
        } else if (activeTeammate) {
            setActiveTeammate(null);
        }
        
        if (snapshot.docs.length === 0 && !localStorage.getItem('migration-checked')) {
            console.log("No accounts found, checking for old projects to migrate...");
            localStorage.setItem('migration-checked', 'true');
            (async () => {
                const oldProjectsSnapshot = await getDocs(collection(db, 'projects'));
                if(oldProjectsSnapshot.empty) {
                    console.log("No old projects to migrate.");
                    setInitializing(false);
                    return;
                }

                const newAccountRef = await addDoc(accountsCollectionRef, { name: 'Default Teammate' });
                const batch = writeBatch(db);

                oldProjectsSnapshot.forEach(oldDoc => {
                    const newProjectRef = doc(db, 'accounts', newAccountRef.id, 'projects', oldDoc.id);
                    batch.set(newProjectRef, {...oldDoc.data(), lastModified: serverTimestamp()});
                    batch.delete(oldDoc.ref);
                });

                await batch.commit();
                console.log("Migration complete.");
            })();
        }
      }, 
      (error) => {
        console.error("Error fetching teammates:", error);
        toast({ title: "Error", description: "Could not fetch teammates.", variant: "destructive" });
        setInitializing(false);
      }
    );
    
    const projectsQuery = query(collectionGroup(db, 'projects'));
    const unsubscribeProjects = onSnapshot(projectsQuery, 
        (snapshot) => {
            const newAllProjectData = new Map<string, ProjectData>();
            const allProjects = snapshot.docs.map(docSnap => {
              const data = docSnap.data() as ProjectData;
              newAllProjectData.set(docSnap.id, data);
              return { ...data, id: docSnap.id, accountId: docSnap.ref.parent.parent?.id } as Project;
            });
            
            allProjects.sort((a, b) => {
                const dateA = a.lastModified ? (a.lastModified as any).seconds * 1000 : 0;
                const dateB = b.lastModified ? (b.lastModified as any).seconds * 1000 : 0;
                return dateB - dateA;
            });
            
            setProjects(allProjects);
            setAllProjectData(newAllProjectData);
            setInitializing(false);
        },
        (error) => {
            console.error("Error fetching projects:", error);
            toast({ title: "Error", description: "Could not load projects.", variant: "destructive" });
            setInitializing(false);
        }
    );

    return () => {
      unsubscribeAccounts();
      unsubscribeProjects();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Effect to handle active teammate change and save to localStorage
  React.useEffect(() => {
    if (activeTeammate) {
      localStorage.setItem(LAST_TEAMMATE_ID_KEY, activeTeammate.id);
      
      const firstProjectInAccount = projects.find(p => p.accountId === activeTeammate.id);
       if (!activeProject || activeProject.accountId !== activeTeammate.id) {
          setActiveProject(firstProjectInAccount || null);
       }
    } else {
        // If there's no active teammate, clear the storage key so the modal shows on next visit
        localStorage.removeItem(LAST_TEAMMATE_ID_KEY);
        setActiveProject(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeammate, projects]);

  // Effect to fetch project data when active project changes
  React.useEffect(() => {
    if (activeProject && activeTeammate) {
      setLoading(true);
      const data = allProjectData.get(activeProject.id);

      if (data) {
        let projectData = {...data};
         if (!projectData.calendars || projectData.calendars.length === 0) {
            const newCalendar: Calendar = {
              id: nanoid(),
              name: 'Main Calendar',
              startDate: '',
              endDate: '',
              calendarData: {},
            };
            projectData.calendars = [newCalendar];
            projectData.activeCalendarId = newCalendar.id;
          }
        setActiveProjectData(projectData);
        const calendarToActivate = projectData.calendars.find(c => c.id === projectData.activeCalendarId) || projectData.calendars[0];
        setActiveCalendar(calendarToActivate);

      } else {
         setActiveProjectData(null);
         setActiveCalendar(null);
      }
      setLoading(false);
    } else {
      setActiveProjectData(null);
      setActiveCalendar(null);
    }
  }, [activeProject, activeTeammate, allProjectData]);

  const createTeammate = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
        const docRef = await addDoc(accountsCollectionRef, { name });
        setActiveTeammate({id: docRef.id, name});
        toast({ title: 'Success', description: `Teammate "${name}" created.`});
    } catch (error) {
        console.error('Error creating teammate:', error);
        toast({ title: 'Error', description: 'Failed to create teammate.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }

  const renameTeammate = async (id: string, name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    const accountDoc = doc(db, 'accounts', id);
    try {
        await updateDoc(accountDoc, { name });
        toast({ title: 'Success', description: 'Teammate renamed.' });
    } catch (error) {
        console.error('Error renaming teammate:', error);
        toast({ title: 'Error', description: 'Failed to rename teammate.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }
  
  const deleteTeammate = async (id: string) => {
    setLoading(true);
    try {
        const projectsQuery = query(collection(db, 'accounts', id, 'projects'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const batch = writeBatch(db);

        for (const projectDoc of projectsSnapshot.docs) {
            const logsRef = collection(db, 'accounts', id, 'projects', projectDoc.id, 'logs');
            const logsSnapshot = await getDocs(logsRef);
            logsSnapshot.forEach(logDoc => batch.delete(logDoc.ref));
            batch.delete(projectDoc.ref);
        }

        batch.delete(doc(db, 'accounts', id));
        await batch.commit();

        toast({ title: 'Success', description: 'Teammate and all their projects deleted.' });

    } catch (error) {
        console.error('Error deleting teammate:', error);
        toast({ title: 'Error', description: 'Failed to delete teammate.', variant: 'destructive' });
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
      const initialData: Omit<ProjectData, 'name' | 'lastModified'> & { name: string, lastModified: any } = {
        name,
        calendars: [newCalendar],
        activeCalendarId: newCalendar.id,
        lastModified: serverTimestamp(),
      };
      const projectCollectionRef = collection(db, 'accounts', accountId, 'projects');
      const docRef = await addDoc(projectCollectionRef, initialData);
      
      const newProject = { ...initialData, id: docRef.id, accountId, lastModified: new Date() } as Project;
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

  const updateProject = async (id: string, name: string, accountId: string) => {
    if (!name.trim() || !accountId) return;
    setLoading(true);
    const projectDoc = doc(db, 'accounts', accountId, 'projects', id);
    try {
      await updateDoc(projectDoc, { name, lastModified: serverTimestamp() });
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
    if (!activeTeammate) return;
    setLoading(true);
    try {
      const projectDocRef = doc(db, 'accounts', activeTeammate.id, 'projects', id);
      const logsCollectionRef = collection(db, 'accounts', activeTeammate.id, 'projects', id, 'logs');
      const logsSnapshot = await getDocs(logsCollectionRef);
      
      const batch = writeBatch(db);
      logsSnapshot.forEach((logDoc) => batch.delete(logDoc.ref));
      batch.delete(projectDocRef);
      await batch.commit();

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
    toast({ title: 'Calendar Created', description: `"${name}" has been added. Save project to persist.` });
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
    toast({ title: 'Calendar Renamed', description: 'Save project to persist changes.' });
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
    toast({ title: 'Calendar Deleted', description: 'Save project to persist changes.' });
  }

  const updateActiveCalendar = (data: Partial<Calendar>) => {
    if (isModalClosing) return;
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
    if (!activeProject || !activeProjectData || !activeCalendar || !activeTeammate) return;
    setLoading(true);
    try {
      const projectRef = doc(db, 'accounts', activeTeammate.id, 'projects', activeProject.id);
      
      const batch = writeBatch(db);
      
      const projectDataToSave = { ...activeProjectData, lastModified: serverTimestamp() };
      batch.set(projectRef, projectDataToSave, {merge: true});
      
      const logsCollectionRef = collection(db, 'accounts', activeTeammate.id, 'projects', activeProject.id, 'logs');
      const ip = 'Unknown'; // Can't get IP on client side easily
      const logEntry = {
        timestamp: new Date(),
        ipAddress: ip,
        changeDescription: `Project "${activeProjectData.name}" (Calendar: ${activeCalendar.name}) was saved.`,
      };
      batch.set(doc(logsCollectionRef), logEntry);
      
      await batch.commit();

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
    toast({ title: 'Import Successful', description: 'Data has been loaded. Click "Save" to persist.' });
  }

  const getProjectById = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  }

  const updatePostInProject = (projectId: string, calendarId: string, date: string, postData: Partial<Post>) => {
    if (!activeTeammate) return;

    const projectRef = doc(db, 'accounts', activeTeammate.id, 'projects', projectId);
    
    const projectData = allProjectData.get(projectId);
    if (!projectData) return;

    const calendar = projectData.calendars.find(c => c.id === calendarId);
    if (!calendar) return;

    const post = calendar.calendarData[date];
    if (!post) return;
    
    calendar.calendarData[date] = { ...post, ...postData };
    
    const updatedCalendars = projectData.calendars.map(c => c.id === calendarId ? calendar : c);
    
    updateDoc(projectRef, { calendars: updatedCalendars, lastModified: serverTimestamp() });
  };

  const movePostInProject = (projectId: string, calendarId: string, sourceDate: string, destinationDate: string) => {
     if (!activeTeammate) return;
      
    const projectRef = doc(db, 'accounts', activeTeammate.id, 'projects', projectId);

    const projectData = allProjectData.get(projectId);
    if (!projectData) return;
            
    const calendar = projectData.calendars.find(c => c.id === calendarId);
    if (!calendar) return;

    const postToMove = calendar.calendarData[sourceDate];
    if (!postToMove) return;

    // Clear missed reason and set to planned
    if (postToMove.missedReason) {
      delete postToMove.missedReason;
    }
    postToMove.status = 'Planned';

    if(calendar.calendarData[destinationDate]) {
        toast({ title: 'Cannot Reschedule', description: 'There is already a post on the selected date.', variant: 'destructive'});
        return;
    }

    delete calendar.calendarData[sourceDate];
    calendar.calendarData[destinationDate] = postToMove;

    const updatedCalendars = projectData.calendars.map(c => c.id === calendarId ? calendar : c);

    updateDoc(projectRef, { calendars: updatedCalendars, lastModified: serverTimestamp() });
  };

  const value = {
    initializing,
    loading,
    teammates,
    activeTeammate,
    projects,
    allProjectData,
    activeProject,
    activeProjectData,
    activeCalendar,
    filters,
    setFilters,
    createTeammate,
    renameTeammate,
    deleteTeammate,
    setActiveTeammate,
    setActiveProject,
    createProject,
    updateProject,
    deleteProject,
    switchActiveCalendar,
    createCalendar,
    updateActiveCalendar: (data: Partial<Calendar>) => {
        if (isModalClosing) return;
        setActiveCalendar(prev => (prev ? { ...prev, ...data } : null));
        setActiveProjectData(prevData => {
          if (!prevData || !activeCalendar) return null;
          const updatedCalendars = prevData.calendars.map(c => 
            c.id === activeCalendar.id ? { ...c, ...data } : c
          );
          return { ...prevData, calendars: updatedCalendars };
        });
    },
    renameCalendar,
    deleteCalendar,
    updatePost,
    deletePost,
    movePost,
    saveProjectToDb,
    importCalendarData,
    updatePostInProject,
    movePostInProject,
    getProjectById,
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
