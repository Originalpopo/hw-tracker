import { getChildTasks } from './src/lib/db';
import { getGlobalSettings } from './src/lib/db';

async function test() {
  const settings = await getGlobalSettings();
  if (!settings) return;
  const studentName = settings.student_name;
  
  const tasks = await getChildTasks(studentName);
  
  const subjects = new Set<string>();
  tasks.forEach(t => subjects.add(t.subject));
  
  console.log("Subjects in ChildTasks:");
  Array.from(subjects).forEach(s => console.log(s));
}

test().catch(console.error);
