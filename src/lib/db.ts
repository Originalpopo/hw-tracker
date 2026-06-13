import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  setDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

// --- Types ---

export type TaskStatus = 'Todo' | 'In Progress' | 'Done' | 'Submitted' | 'Rework' | 'Verified';

export interface ChildTask {
  id?: string;
  subject: string;
  task_name: string;
  status: TaskStatus;
  created_at: Timestamp | Date;
  updated_at: Timestamp | Date;
  teacher_column_id: string | null;
  student_name: string; // The child's name for filtering
}

export interface TeacherColumn {
  id: string; // Usually a combination of subject + column_name
  subject: string;
  column_name: string;
  is_checked: boolean;
  last_synced: Timestamp | Date;
  student_name: string; // The child's name for filtering
}

// --- Collections ---
const CHILD_TASKS_COLLECTION = "hw_child_tasks";
const TEACHER_COLUMNS_COLLECTION = "hw_teacher_columns";

// --- Utility Functions ---

/**
 * Fetch all tasks for a specific child
 */
export async function getChildTasks(studentName: string): Promise<ChildTask[]> {
  if (!studentName) return [];
  const q = query(
    collection(db, CHILD_TASKS_COLLECTION),
    where("student_name", "==", studentName)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildTask));
}

/**
 * Add a new task for a child
 */
export async function addChildTask(task: Omit<ChildTask, "id" | "created_at" | "updated_at">) {
  const docRef = await addDoc(collection(db, CHILD_TASKS_COLLECTION), {
    ...task,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update a child's task status
 */
export async function updateChildTaskStatus(taskId: string, status: TaskStatus) {
  const docRef = doc(db, CHILD_TASKS_COLLECTION, taskId);
  await updateDoc(docRef, {
    status,
    updated_at: serverTimestamp()
  });
}

/**
 * Update a child's task (generic)
 */
export async function updateChildTask(taskId: string, data: Partial<ChildTask>) {
  const docRef = doc(db, CHILD_TASKS_COLLECTION, taskId);
  await updateDoc(docRef, {
    ...data,
    updated_at: serverTimestamp()
  });
}

/**
 * Delete a child's task
 */
export async function deleteChildTask(taskId: string) {
  const docRef = doc(db, CHILD_TASKS_COLLECTION, taskId);
  await deleteDoc(docRef);
}

/**
 * Clear ALL tasks for a specific child (Danger zone)
 */
export async function clearAllChildTasks(studentName: string, subject?: string) {
  if (!studentName) return;
  
  let q;
  if (subject && subject !== 'All') {
    q = query(
      collection(db, CHILD_TASKS_COLLECTION),
      where("student_name", "==", studentName),
      where("subject", "==", subject)
    );
  } else {
    q = query(
      collection(db, CHILD_TASKS_COLLECTION),
      where("student_name", "==", studentName)
    );
  }

  const querySnapshot = await getDocs(q);
  const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
}

/**
 * Fetch teacher columns for a specific student
 */
export async function getTeacherColumns(studentName: string): Promise<TeacherColumn[]> {
  if (!studentName) return [];
  const q = query(
    collection(db, TEACHER_COLUMNS_COLLECTION),
    where("student_name", "==", studentName)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherColumn));
}

/**
 * Clear all teacher columns for a specific student (used before sync)
 */
export async function clearTeacherColumnsForStudent(studentName: string) {
  if (!studentName) return;
  const q = query(
    collection(db, TEACHER_COLUMNS_COLLECTION),
    where("student_name", "==", studentName)
  );
  const querySnapshot = await getDocs(q);
  const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
}

/**
 * Sync teacher columns (Upsert: Add or Update)
 */
export async function syncTeacherColumn(column: TeacherColumn) {
  // Use a custom ID so we don't duplicate columns
  // ID format: safe string of `${studentName}_${subject}_${columnName}`
  const docRef = doc(db, TEACHER_COLUMNS_COLLECTION, column.id);
  await setDoc(docRef, column, { merge: true });
}
