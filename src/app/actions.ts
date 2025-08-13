'use server';

import { headers } from 'next/headers';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProjectData } from '@/lib/types';

export async function saveProjectAndLog(projectId: string, projectData: ProjectData, calendarName: string) {
  const ip = headers().get('x-forwarded-for') || 'Unknown';
  
  const projectDocRef = doc(db, 'projects', projectId);
  const logsCollectionRef = collection(db, 'projects', projectId, 'logs');

  try {
    // 1. Save the project data
    await setDoc(projectDocRef, projectData);

    // 2. Create a log entry
    await addDoc(logsCollectionRef, {
      timestamp: new Date(),
      ipAddress: ip,
      changeDescription: `Project "${projectData.name}" (Calendar: ${calendarName}) was saved.`,
    });

    return { success: true, message: 'Project saved successfully!' };
  } catch (error) {
    console.error('Error saving project and creating log:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to save project: ${errorMessage}` };
  }
}
