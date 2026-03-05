'use client';

import * as React from 'react';
import type { Project, ProjectData, Post, PostStatus, PostType, Calendar, Teammate, Account } from '@/lib/types';
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
import { format } from 'date-fns';
import { saveProjectAndLog } from '@/app/actions';


const LAST_TEAMMATE_ID_KEY = 'collabcal-last-teammate-id';
const LAST_ACCOUNT_ID_KEY = 'collabcal-last-account-id';

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
  accounts: Account[];
  activeAccount: Account | null;
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
  createAccount: (name: string) => Promise<void>;
  renameAccount: (id: string, name: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setActiveAccount: (account: Account | null) => void;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string, accountId: string) => Promise<void>;
  updateProject: (id: string, name: string, accountId: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  switchActiveCalendar: (calendarId: string) => void;
  createCalendar: (name: string) => void;
  updateActiveCalendar: (data: Partial<Calendar>) => void;
  renameCalendar: (calendarId: string, newName: string) => void;
  deleteCalendar: (calendarId: string) => void;
  updatePost: (date: string, post: Post, isNew: boolean) => void;
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
  const [activeTeammate, setActiveTeammateInternal] = React.useState<Teammate | null>(null);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = React.useState<Account | null>(null);
  
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [allProjectData, setAllProjectData] = React.useState<Map<string, ProjectData>>(new Map());
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [activeProjectData, setActiveProjectData] = React.useState<ProjectData | null>(null);
  const [activeCalendar, setActiveCalendar] = React.useState<Calendar | null>(null);

  const [changeLog, setChangeLog] = React.useState<string[]>([]);

  const [filters, setFilters] = React.useState<Filters>({
    status: [],
    types: [],
    platforms: [],
  });
  const { toast } = useToast();

  const teammatesCollectionRef = collection(db, 'teammates');
  const accountsCollectionRef = collection(db, 'accounts');

  const addChangeLogEntry = React.useCallback((message: string) => {
    setChangeLog(prev => [...prev, message]);
  }, []);

  const setActiveTeammate = (teammate: Teammate | null) => {
    setActiveTeammateInternal(teammate);
    if(teammate) {
        localStorage.setItem(LAST_TEAMMATE_ID_KEY, teammate.id);
    } else {
        localStorage.removeItem(LAST_TEAMMATE_ID_KEY);
    }
  }

  React.useEffect(() => {
    setInitializing(true);
    const lastUsedTeammateId = localStorage.getItem(LAST_TEAMMATE_ID_KEY);
    const lastUsedAccountId = localStorage.getItem(LAST_ACCOUNT_ID_KEY);

    const unsubscribeTeammates = onSnapshot(teammatesCollectionRef, 
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
        } else {
            setActiveTeammate(null);
        }
      },
      (error) => console.error("Error fetching teammates:", error)
    );

    const unsubscribeAccounts = onSnapshot(accountsCollectionRef, 
      (snapshot) => {
        const fetchedAccounts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Account));
        setAccounts(fetchedAccounts);
        
        if (fetchedAccounts.length > 0) {
            const accountToSet = lastUsedAccountId 
                ? (fetchedAccounts.find(a => a.id === lastUsedAccountId) || fetchedAccounts[0])
                : fetchedAccounts[0];
            if (activeAccount?.id !== accountToSet?.id) {
                setActiveAccount(accountToSet);
            }
        } else if (activeAccount) {
            setActiveAccount(null);
        }
      }, 
      (error) => {
        console.error("Error fetching accounts:", error);
        toast({ title: "Error", description: "Could not load accounts.", variant: "destructive" });
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
      unsubscribeTeammates();
      unsubscribeAccounts();
      unsubscribeProjects();
    };
  }, []);

  React.useEffect(() => {
      if (activeAccount) {
        localStorage.setItem(LAST_ACCOUNT_ID_KEY, activeAccount.id);
        const firstProjectInAccount = projects.find(p => p.accountId === activeAccount.id);
         if (!activeProject || activeProject.accountId !== activeAccount.id) {
            setActiveProject(firstProjectInAccount || null);
         }
      } else {
          localStorage.removeItem(LAST_ACCOUNT_ID_KEY);
          setActiveProject(null);
      }
  }, [activeAccount, projects]);

  React.useEffect(() => {
    if (activeProject && activeAccount) {
      setLoading(true);
      const data = allProjectData.get(activeProject.id);

      if (data) {
        let projectData = {...data};
        if (!projectData.calendars) {
          projectData.calendars = [];
        }
        setActiveProjectData(projectData);
        const calendarToActivate = projectData.calendars.find(c => c.id === projectData.activeCalendarId) || (projectData.calendars.length > 0 ? projectData.calendars[0] : null);
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
  }, [activeProject, activeAccount, allProjectData]);

  // Helper function to persist activeProjectData to Firestore (Autosave)
  const persistActiveProjectData = async (updatedData: ProjectData) => {
    if (!activeProject || !activeAccount) return;
    const projectRef = doc(db, 'accounts', activeAccount.id, 'projects', activeProject.id);
    try {
      await updateDoc(projectRef, {
        ...updatedData,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Autosave error:', error);
    }
  };

  const createTeammate = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
        const docRef = await addDoc(teammatesCollectionRef, { name });
        setActiveTeammate({id: docRef.id, name});
        toast({ title: 'Success', description: `User "${name}" added.`});
    } catch (error) {
        console.error('Error creating user:', error);
        toast({ title: 'Error', description: 'Failed to add user.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }

  const renameTeammate = async (id: string, name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    const teammateDoc = doc(db, 'teammates', id);
    try {
        await updateDoc(teammateDoc, { name });
        toast({ title: 'Success', description: 'User renamed.' });
    } catch (error) {
        console.error('Error renaming user:', error);
        toast({ title: 'Error', description: 'Failed to rename user.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  }
  
  const deleteTeammate = async (id: string) => {
    setLoading(true);
    try {
        await deleteDoc(doc(db, 'teammates', id));
        toast({ title: 'Success', description: 'User deleted.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        toast({ title: 'Error', description: 'Failed to delete user.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const createAccount = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
        const docRef = await addDoc(accountsCollectionRef, { name });
        setActiveAccount({id: docRef.id, name});
        addChangeLogEntry(`Created account "${name}"`);
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
    const originalName = accounts.find(acc => acc.id === id)?.name || '';
    setLoading(true);
    const accountDoc = doc(db, 'accounts', id);
    try {
        await updateDoc(accountDoc, { name });
        addChangeLogEntry(`Renamed account from "${originalName}" to "${name}"`);
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
        const accountName = accounts.find(acc => acc.id === id)?.name || 'Unknown Account';
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

        addChangeLogEntry(`Deleted account "${accountName}"`);
        toast({ title: 'Success', description: 'Account deleted.' });

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
      const initialData: Omit<ProjectData, 'name' | 'lastModified'> & { name: string, lastModified: any } = {
        name,
        calendars: [],
        activeCalendarId: null,
        lastModified: serverTimestamp(),
      };
      const projectCollectionRef = collection(db, 'accounts', accountId, 'projects');
      const docRef = await addDoc(projectCollectionRef, initialData);
      
      const newProject = { ...initialData, id: docRef.id, accountId, lastModified: new Date() } as Project;
      setActiveProject(newProject);
      addChangeLogEntry(`Created project "${name}"`);
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
      addChangeLogEntry(`Renamed project to "${name}"`);
      toast({ title: 'Success', description: 'Project renamed.' });
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
      const projectName = projects.find(p => p.id === id)?.name || 'Unknown Project';
      const projectDocRef = doc(db, 'accounts', activeAccount.id, 'projects', id);
      const logsCollectionRef = collection(db, 'accounts', activeAccount.id, 'projects', id, 'logs');
      const logsSnapshot = await getDocs(logsCollectionRef);
      
      const batch = writeBatch(db);
      logsSnapshot.forEach((logDoc) => batch.delete(logDoc.ref));
      batch.delete(projectDocRef);
      await batch.commit();

      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      addChangeLogEntry(`Deleted project "${projectName}"`);
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

  const switchActiveCalendar = (calendarId: string) => {
    if (!activeProjectData) return;
    const newActiveCalendar = activeProjectData.calendars.find(c => c.id === calendarId);
    if (newActiveCalendar) {
      setActiveCalendar(newActiveCalendar);
      const updatedData = { ...activeProjectData, activeCalendarId: calendarId };
      setActiveProjectData(updatedData);
      persistActiveProjectData(updatedData);
      addChangeLogEntry(`Viewed "${newActiveCalendar.name}"`);
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
    const updatedData = { ...activeProjectData, calendars: updatedCalendars, activeCalendarId: newCalendar.id };
    setActiveProjectData(updatedData);
    setActiveCalendar(newCalendar);
    persistActiveProjectData(updatedData);
    addChangeLogEntry(`Created calendar "${name}"`);
    toast({ title: 'Added', description: `"${name}" added.` });
  };

  const renameCalendar = (calendarId: string, newName: string) => {
    if (!activeProjectData) return;
    const originalName = activeProjectData.calendars.find(c => c.id === calendarId)?.name || '';
    const updatedCalendars = activeProjectData.calendars.map(c => 
      c.id === calendarId ? { ...c, name: newName } : c
    );
    const updatedData = { ...activeProjectData, calendars: updatedCalendars };
    setActiveProjectData(updatedData);
    if(activeCalendar?.id === calendarId) {
      setActiveCalendar(prev => prev ? {...prev, name: newName} : null);
    }
    persistActiveProjectData(updatedData);
    addChangeLogEntry(`Renamed calendar to "${newName}"`);
    toast({ title: 'Renamed' });
  }

  const deleteCalendar = (calendarId: string) => {
    if (!activeProjectData) return;

    const calendarName = activeProjectData.calendars.find(c => c.id === calendarId)?.name || '';
    const updatedCalendars = activeProjectData.calendars.filter(c => c.id !== calendarId);
    
    let newActiveCalendarId = activeProjectData.activeCalendarId;
    if (activeProjectData.activeCalendarId === calendarId) {
      newActiveCalendarId = updatedCalendars.length > 0 ? updatedCalendars[0].id : null;
    }
    
    const updatedData = { ...activeProjectData, calendars: updatedCalendars, activeCalendarId: newActiveCalendarId };
    setActiveProjectData(updatedData);
    setActiveCalendar(updatedCalendars.find(c => c.id === newActiveCalendarId) || null);
    persistActiveProjectData(updatedData);
    addChangeLogEntry(`Deleted calendar "${calendarName}"`);
    toast({ title: 'Deleted' });
  }

  const updateActiveCalendar = (data: Partial<Calendar>) => {
    if (!activeProjectData || !activeCalendar) return;
    const updatedCalendars = activeProjectData.calendars.map(c => 
      c.id === activeCalendar.id ? { ...c, ...data } : c
    );
    const updatedData = { ...activeProjectData, calendars: updatedCalendars };
    setActiveCalendar(prev => (prev ? { ...prev, ...data } : null));
    setActiveProjectData(updatedData);
    persistActiveProjectData(updatedData);
  };

  const updatePost = (date: string, post: Post, isNew: boolean) => {
    if (!activeCalendar || !activeProjectData) return;

    if (isNew) {
        addChangeLogEntry(`Created post "${post.title}" on ${format(new Date(date), 'MM/dd/yyyy')}`);
    } else {
        const originalPost = activeCalendar.calendarData[date];
        if (originalPost?.status !== post.status) {
            addChangeLogEntry(`Updated "${post.title}" to ${post.status}`);
        } else {
            addChangeLogEntry(`Updated "${post.title}"`);
        }
    }

    const newCalendarData = { ...activeCalendar.calendarData, [date]: post };
    updateActiveCalendar({ calendarData: newCalendarData });
  };

  const deletePost = (date: string) => {
    if (!activeCalendar) return;
    const postToDelete = activeCalendar.calendarData[date];
    if (postToDelete) {
        addChangeLogEntry(`Deleted "${postToDelete.title}"`);
    }
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

    addChangeLogEntry(`Moved "${sourcePost.title}" to ${format(new Date(destinationDate), 'MM/dd/yyyy')}`);
    
    delete newCalendarData[sourceDate];
    newCalendarData[destinationDate] = sourcePost;

    if (destinationPost) {
        newCalendarData[sourceDate] = destinationPost;
    }
    updateActiveCalendar({ calendarData: newCalendarData });
  };

  const saveProjectToDb = async () => {
    if (!activeProject || !activeProjectData || !activeAccount || !activeTeammate) {
        toast({ title: "Error", description: "Pick a project and user.", variant: "destructive"});
        return;
    }
    setLoading(true);
    
    const { lastModified, ...dataToSave } = activeProjectData;

    try {
      const result = await saveProjectAndLog(activeAccount.id, activeProject.id, dataToSave, changeLog, activeTeammate.name);

      if (result.success) {
        setChangeLog([]);
        toast({ title: 'Saved', description: 'Your progress is saved.' });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Save failed.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const importCalendarData = (data: Partial<Calendar>) => {
    if (!activeCalendar) {
        toast({ title: 'Error', description: 'Pick a calendar first.', variant: 'destructive' });
        return;
    }
    const calendarData = data.calendarData || {};
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
    addChangeLogEntry(`Imported data`);
    toast({ title: 'Imported' });
  }

  const getProjectById = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  }

  const updatePostInProject = (projectId: string, calendarId: string, date: string, postData: Partial<Post>) => {
    const project = getProjectById(projectId);
    if (!project || !project.accountId) return;

    const projectRef = doc(db, 'accounts', project.accountId, 'projects', projectId);
    
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
    const project = getProjectById(projectId);
    if (!project || !project.accountId) return;
      
    const projectRef = doc(db, 'accounts', project.accountId, 'projects', projectId);

    const projectData = allProjectData.get(projectId);
    if (!projectData) return;
            
    const calendar = projectData.calendars.find(c => c.id === calendarId);
    if (!calendar) return;

    const postToMove = calendar.calendarData[sourceDate];
    if (!postToMove) return;

    if (postToMove.missedReason) {
      delete postToMove.missedReason;
    }
    postToMove.status = 'Planned';

    if(calendar.calendarData[destinationDate]) {
        toast({ title: 'Error', description: 'Date is taken.', variant: 'destructive'});
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
    accounts,
    activeAccount,
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
