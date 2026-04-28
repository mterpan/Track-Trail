import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db as firestoreDb, auth } from './firebase';
import { MOCK_APPLICATIONS, MOCK_STATUS_EVENTS, MOCK_CONTACTS } from './mockData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type ApplicationStatus = 'Draft' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected' | 'Accepted' | 'Withdrawn';

export interface Application {
  id: string;
  userId: string;
  company: string;
  title: string;
  url?: string;
  logoUrl?: string; // Cached logo URL
  dateApplied: string; // ISO Date string
  status: ApplicationStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StatusEvent {
  id: string;
  userId: string;
  applicationId: string;
  status: ApplicationStatus;
  date: string; // ISO Date string
  notes?: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  userId: string;
  applicationId: string;
  name: string;
  type: string;
  size: number;
  data?: string; // Store as base64 string in Firestore (if small)
  hasChunks?: boolean;
  chunkCount?: number;
  createdAt: number;
}

export interface AttachmentChunk {
  id: string;
  userId: string;
  attachmentId: string;
  chunkIndex: number;
  data: string;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  company: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  dateContacted: string; // ISO Date string
  linkedinUrl?: string;
  createdAt: number;
}

// --- FIRESTORE FUNCTIONS ---

export async function getApplications(): Promise<Application[]> {
  if (isDemoMode()) {
    return getDemoData<Application[]>('applications') || MOCK_APPLICATIONS;
  }
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'applications';
  try {
    const q = query(collection(firestoreDb, path), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Application);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getApplication(id: string): Promise<Application | undefined> {
  if (isDemoMode()) {
    const apps = getDemoData<Application[]>('applications') || MOCK_APPLICATIONS;
    return apps.find(a => a.id === id);
  }
  const user = auth.currentUser;
  if (!user) return undefined;
  const path = `applications/${id}`;
  try {
    const docRef = doc(firestoreDb, 'applications', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists() && snapshot.data().userId === user.uid) {
      return snapshot.data() as Application;
    }
    return undefined;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return undefined;
  }
}

export async function saveApplication(app: Application): Promise<void> {
  if (isDemoMode()) {
    const apps = getDemoData<Application[]>('applications') || [...MOCK_APPLICATIONS];
    const index = apps.findIndex(a => a.id === app.id);
    if (index >= 0) apps[index] = app;
    else apps.push(app);
    saveDemoData('applications', apps);
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  const path = `applications/${app.id}`;
  try {
    app.userId = user.uid;
    await setDoc(doc(firestoreDb, 'applications', app.id), app);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteApplication(id: string): Promise<void> {
  if (isDemoMode()) {
    const apps = getDemoData<Application[]>('applications') || [...MOCK_APPLICATIONS];
    saveDemoData('applications', apps.filter(a => a.id !== id));
    
    const events = getDemoData<StatusEvent[]>('status_events') || [...MOCK_STATUS_EVENTS];
    saveDemoData('status_events', events.filter(e => e.applicationId !== id));
    
    const atts = getDemoData<Attachment[]>('attachments') || [];
    saveDemoData('attachments', atts.filter(a => a.applicationId !== id));
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  
  const path = `applications/${id}`;
  try {
    const batch = writeBatch(firestoreDb);
    
    // Delete application
    batch.delete(doc(firestoreDb, 'applications', id));
    
    // Delete related events
    const eventsQ = query(collection(firestoreDb, 'status_events'), where('applicationId', '==', id), where('userId', '==', user.uid));
    const eventsSnapshot = await getDocs(eventsQ);
    eventsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete related attachments
    const attachmentsQ = query(collection(firestoreDb, 'attachments'), where('applicationId', '==', id), where('userId', '==', user.uid));
    const attachmentsSnapshot = await getDocs(attachmentsQ);
    for (const attachmentDoc of attachmentsSnapshot.docs) {
      const att = attachmentDoc.data() as Attachment;
      batch.delete(attachmentDoc.ref);
      
      if (att.hasChunks) {
        const chunksQ = query(collection(firestoreDb, 'attachment_chunks'), where('attachmentId', '==', att.id), where('userId', '==', user.uid));
        const chunksSnapshot = await getDocs(chunksQ);
        chunksSnapshot.docs.forEach(chunkDoc => {
          batch.delete(chunkDoc.ref);
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getStatusEvents(applicationId: string): Promise<StatusEvent[]> {
  if (isDemoMode()) {
    const events = getDemoData<StatusEvent[]>('status_events') || MOCK_STATUS_EVENTS;
    return events.filter(e => e.applicationId === applicationId);
  }
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'status_events';
  try {
    const q = query(collection(firestoreDb, path), where('applicationId', '==', applicationId), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StatusEvent);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllStatusEvents(): Promise<StatusEvent[]> {
  if (isDemoMode()) {
    return getDemoData<StatusEvent[]>('status_events') || MOCK_STATUS_EVENTS;
  }
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'status_events';
  try {
    const q = query(collection(firestoreDb, path), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StatusEvent);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveStatusEvent(event: StatusEvent): Promise<void> {
  if (isDemoMode()) {
    const events = getDemoData<StatusEvent[]>('status_events') || [...MOCK_STATUS_EVENTS];
    const index = events.findIndex(e => e.id === event.id);
    if (index >= 0) events[index] = event;
    else events.push(event);
    saveDemoData('status_events', events);
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  const path = `status_events/${event.id}`;
  try {
    event.userId = user.uid;
    await setDoc(doc(firestoreDb, 'status_events', event.id), event);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getContacts(): Promise<Contact[]> {
  if (isDemoMode()) {
    return getDemoData<Contact[]>('contacts') || MOCK_CONTACTS;
  }
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'contacts';
  try {
    const q = query(collection(firestoreDb, path), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Contact);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveContact(contact: Contact): Promise<void> {
  if (isDemoMode()) {
    const contacts = getDemoData<Contact[]>('contacts') || [...MOCK_CONTACTS];
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index >= 0) contacts[index] = contact;
    else contacts.push(contact);
    saveDemoData('contacts', contacts);
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  const path = `contacts/${contact.id}`;
  try {
    contact.userId = user.uid;
    await setDoc(doc(firestoreDb, 'contacts', contact.id), contact);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteContact(id: string): Promise<void> {
  if (isDemoMode()) {
    const contacts = getDemoData<Contact[]>('contacts') || [...MOCK_CONTACTS];
    saveDemoData('contacts', contacts.filter(c => c.id !== id));
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  const path = `contacts/${id}`;
  try {
    await deleteDoc(doc(firestoreDb, 'contacts', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllData(): Promise<void> {
  if (isDemoMode()) {
    localStorage.removeItem('trackntrail_demo_applications');
    localStorage.removeItem('trackntrail_demo_status_events');
    localStorage.removeItem('trackntrail_demo_contacts');
    localStorage.removeItem('trackntrail_demo_attachments');
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  
  const deleteCollection = async (collectionName: string, userIdField: string = 'userId') => {
    const q = query(collection(firestoreDb, collectionName), where(userIdField, '==', user.uid));
    const snapshot = await getDocs(q);
    
    // Firestore batch limit is 500
    const chunks = [];
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      chunks.push(snapshot.docs.slice(i, i + 500));
    }
    
    for (const chunk of chunks) {
      const batch = writeBatch(firestoreDb);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  };

  await deleteCollection('applications');
  await deleteCollection('status_events');
  await deleteCollection('contacts');
  await deleteCollection('attachments');
  await deleteCollection('attachment_chunks');
}

// --- ATTACHMENT FUNCTIONS (Firestore) ---

export async function getAttachments(applicationId: string): Promise<Attachment[]> {
  if (isDemoMode()) {
    const atts = getDemoData<Attachment[]>('attachments') || [];
    return atts.filter(a => a.applicationId === applicationId);
  }
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'attachments';
  try {
    const q = query(collection(firestoreDb, path), where('applicationId', '==', applicationId), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const attachments = snapshot.docs.map(doc => doc.data() as Attachment);
    return attachments;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllAttachments(): Promise<Attachment[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = 'attachments';
  try {
    const q = query(collection(firestoreDb, path), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Attachment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAttachmentData(attachment: Attachment): Promise<string> {
  if (!attachment.hasChunks) return attachment.data || '';
  
  const user = auth.currentUser;
  if (!user) return '';
  
  try {
    const chunksQ = query(collection(firestoreDb, 'attachment_chunks'), where('attachmentId', '==', attachment.id), where('userId', '==', user.uid));
    const chunksSnapshot = await getDocs(chunksQ);
    const chunks = chunksSnapshot.docs.map(doc => doc.data() as AttachmentChunk);
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    return chunks.map(c => c.data).join('');
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `attachment_chunks/${attachment.id}`);
    return '';
  }
}

const CHUNK_SIZE = 800000; // Safe limit for base64 in 1MB document

export async function saveAttachment(attachment: Attachment): Promise<void> {
  if (isDemoMode()) {
    const atts = getDemoData<Attachment[]>('attachments') || [];
    const index = atts.findIndex(a => a.id === attachment.id);
    if (index >= 0) atts[index] = attachment;
    else atts.push(attachment);
    saveDemoData('attachments', atts);
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  
  const data = attachment.data || '';
  const path = `attachments/${attachment.id}`;
  
  try {
    attachment.userId = user.uid;
    
    if (data.length > CHUNK_SIZE) {
      attachment.hasChunks = true;
      const chunks: string[] = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.substring(i, i + CHUNK_SIZE));
      }
      attachment.chunkCount = chunks.length;
      
      // Remove data from main document to stay under 1MB
      const { data: _, ...metadata } = attachment;
      
      const batch = writeBatch(firestoreDb);
      batch.set(doc(firestoreDb, 'attachments', attachment.id), metadata);
      
      chunks.forEach((chunkData, index) => {
        const chunkId = `${attachment.id}_${index}`;
        const chunk: AttachmentChunk = {
          id: chunkId,
          userId: user.uid,
          attachmentId: attachment.id,
          chunkIndex: index,
          data: chunkData
        };
        batch.set(doc(firestoreDb, 'attachment_chunks', chunkId), chunk);
      });
      
      await batch.commit();
    } else {
      attachment.hasChunks = false;
      attachment.chunkCount = 0;
      await setDoc(doc(firestoreDb, 'attachments', attachment.id), attachment);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAttachment(id: string): Promise<void> {
  if (isDemoMode()) {
    const atts = getDemoData<Attachment[]>('attachments') || [];
    saveDemoData('attachments', atts.filter(a => a.id !== id));
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in");
  
  const path = `attachments/${id}`;
  try {
    const batch = writeBatch(firestoreDb);
    
    // Get metadata to check for chunks
    const attDoc = await getDoc(doc(firestoreDb, 'attachments', id));
    if (attDoc.exists()) {
      const att = attDoc.data() as Attachment;
      batch.delete(attDoc.ref);
      
      if (att.hasChunks) {
        const chunksQ = query(collection(firestoreDb, 'attachment_chunks'), where('attachmentId', '==', id), where('userId', '==', user.uid));
        const chunksSnapshot = await getDocs(chunksQ);
        chunksSnapshot.docs.forEach(chunkDoc => {
          batch.delete(chunkDoc.ref);
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- DEMO MODE HELPERS ---

export function isDemoMode(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem('trackntrail_demo_mode') === 'true';
}

export function setDemoMode(active: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (active) {
    localStorage.setItem('trackntrail_demo_mode', 'true');
  } else {
    localStorage.removeItem('trackntrail_demo_mode');
  }
}

function saveDemoData(key: string, data: any): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`trackntrail_demo_${key}`, JSON.stringify(data));
}

function getDemoData<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  const data = localStorage.getItem(`trackntrail_demo_${key}`);
  return data ? JSON.parse(data) : null;
}
