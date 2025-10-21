'use server';

import { headers } from 'next/headers';
import { doc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProjectData } from '@/lib/types';


export async function saveProjectAndLog(
  accountId: string, 
  projectId: string, 
  projectData: Omit<ProjectData, 'lastModified'>, 
  changeLog: string[],
  teammateName: string
) {
  const ip = headers().get('x-forwarded-for') || 'Unknown';
  
  const projectDocRef = doc(db, 'accounts', accountId, 'projects', projectId);
  const logsCollectionRef = collection(db, 'accounts', accountId, 'projects', projectId, 'logs');

  try {
    const batch = writeBatch(db);
    
    // 1. Save the project data with a server timestamp
    const projectDataToSave = {
        ...projectData,
        lastModified: serverTimestamp()
    };
    batch.set(projectDocRef, projectDataToSave, { merge: true });

    // 2. Create log entries
    if (changeLog.length > 0) {
        changeLog.forEach(description => {
            const logEntry = {
              timestamp: serverTimestamp(),
              ipAddress: ip,
              changeDescription: `${description} by ${teammateName}.`,
            };
            batch.set(doc(logsCollectionRef), logEntry);
        });
    } else {
        // Even if there are no specific changes, log the save action
        const logEntry = {
            timestamp: serverTimestamp(),
            ipAddress: ip,
            changeDescription: `Project "${projectData.name}" was saved by ${teammateName}.`,
        };
        batch.set(doc(logsCollectionRef), logEntry);
    }
    
    await batch.commit();

    return { success: true, message: 'Project saved successfully!' };
  } catch (error) {
    console.error('Error saving project and creating log:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to save project: ${errorMessage}` };
  }
}
