'use server';

import { headers } from 'next/headers';
import { doc, setDoc, addDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProjectData } from '@/lib/types';

// This function is kept for potential future use but is currently not used
// as saving logic has been moved to the client-side context for simplicity
// in the new account-based structure.
export async function saveProjectAndLog(
  accountId: string, 
  projectId: string, 
  projectData: ProjectData, 
  calendarName: string
) {
  const ip = headers().get('x-forwarded-for') || 'Unknown';
  
  const projectDocRef = doc(db, 'accounts', accountId, 'projects', projectId);
  const logsCollectionRef = collection(db, 'accounts', accountId, 'projects', projectId, 'logs');

  try {
    const batch = writeBatch(db);
    
    // 1. Save the project data
    batch.set(projectDocRef, projectData);

    // 2. Create a log entry
    const logDocRef = doc(logsCollectionRef); // Create a new doc ref for the log
    batch.set(logDocRef, {
      timestamp: new Date(),
      ipAddress: ip,
      changeDescription: `Project "${projectData.name}" (Calendar: ${calendarName}) was saved.`,
    });
    
    await batch.commit();

    return { success: true, message: 'Project saved successfully!' };
  } catch (error) {
    console.error('Error saving project and creating log:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to save project: ${errorMessage}` };
  }
}
