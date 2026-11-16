// ข้อมูลสมมติสำหรับทดสอบหน้าเว็บ (เติม ?demo=1 ท้ายลิงก์ของหน้า ภาพรวม / งานทั้งหมด / งานค้างจากครู)
// ใช้ได้เฉพาะตอนรัน dev บนเครื่อง (npm run dev) และไม่เขียนลง Firestore เลย
import { ChildTask, MyTask, TaskStatus, TeacherColumn } from './db';

export function isHomeworkDemo(params: { get(name: string): string | null }): boolean {
  return process.env.NODE_ENV === 'development' && params.get('demo') === '1';
}

/** อ่าน ?demo=1 จากลิงก์ปัจจุบัน (สำหรับหน้าที่ไม่ได้ใช้ useSearchParams) */
export function isHomeworkDemoUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return isHomeworkDemo(new URLSearchParams(window.location.search));
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * [วิชา, ชื่องาน, ครูติ๊กในชีทแล้วไหม, สถานะฝั่งลูก (null = ยังไม่มีบันทึก), กด "ทำเสร็จแล้ว" มากี่วัน]
 * ครอบคลุมทุกกรณีที่ต้องจัดการ
 */
const ROWS: [string, string, boolean, TaskStatus | null, number?][] = [
  ['คณิตศาสตร์+เพิ่มเติม', 'แบบฝึกหัด 6.1 (ครูติ๊กแล้ว - ต้องไม่โผล่ในงานค้าง)', true, 'Verified'],
  ['คณิตศาสตร์+เพิ่มเติม', 'แบบฝึกหัด 6.2 (ยังไม่ทำ)', false, 'Todo'],
  ['คณิตศาสตร์+เพิ่มเติม', 'แบบฝึกหัด 6.3 (ทำเสร็จวันนี้ รออัปเดต)', false, 'Submitted', 0],
  ['คณิตศาสตร์+เพิ่มเติม', 'แบบฝึกหัด 6.4 (ทำเสร็จ 10 วันแล้ว ครูยังไม่ติ๊ก - ต้องเตือน)', false, 'Submitted', 10],
  ['ภาษาไทย', 'ใบงานคำควบกล้ำ (ครูให้แก้ไข)', false, 'Rework'],
  ['ภาษาไทย', 'เรียงความบ้านของฉัน (ยังไม่ทำ)', false, 'Todo'],
  ['ภาษาอังกฤษ', 'Workbook p.14 (ฝั่งลูกค้างสถานะ Verified แต่ครูยังไม่ติ๊ก - ต้องอยู่ช่องยังไม่ทำ)', false, 'Verified'],
  ['ภาษาอังกฤษ', 'Workbook p.15 (ส่งแล้ว ครูติ๊กแล้ว - ต้องไม่โผล่ในงานค้าง)', true, 'Submitted', 2],
  ['ทักษะภาษาจีน', '练习本 แบบฝึกหัด หน้าที่ 38 (ยังไม่ทำ)', false, 'Todo'],
  ['ทักษะภาษาจีน', '练习本 แบบฝึกหัด หน้าที่ 39 (ทำเสร็จ 3 วันแล้ว รออัปเดต)', false, 'Submitted', 3],
  ['วิทยาศาสตร์', 'สมุดบันทึกการทดลอง (สถานะ "ทำเสร็จ รอส่ง" จากระบบเดิม 8 วัน - ต้องเตือน)', false, 'Done', 8],
];

/** กำหนดส่งสมมติ: แถวที่ -> อีกกี่วันถึงวันส่ง (ติดลบ = เลยกำหนด) */
const DUE_IN_DAYS: Record<number, number> = { 1: -3, 4: 0, 5: 1, 6: 4, 9: 2 };

function localDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getHomeworkDemo(studentName: string): { cols: TeacherColumn[]; tasks: ChildTask[] } {
  const now = new Date();
  const cols: TeacherColumn[] = [];
  const tasks: ChildTask[] = [];
  ROWS.forEach(([subject, name, checked, status, daysAgo], i) => {
    const id = `demo_col_${i}`;
    cols.push({ id, subject, column_name: name, is_checked: checked, last_synced: now, student_name: studentName, sequence: i + 1, first_seen_at: now.getTime() - 5 * DAY });
    if (status) {
      const doneAt = typeof daysAgo === 'number' ? now.getTime() - daysAgo * DAY - 60 * 1000 : undefined;
      tasks.push({
        id: `demo_task_${i}`, subject, task_name: name, status,
        created_at: new Date(now.getTime() - 20 * DAY), updated_at: doneAt ? new Date(doneAt) : now,
        teacher_column_id: id, student_name: studentName, task_type: 'official',
        ...(i in DUE_IN_DAYS ? { due_date: localDate(now.getTime() + DUE_IN_DAYS[i] * DAY) } : {}),
        revision_history: doneAt
          ? [{ revision: 1, action: status === 'Done' ? 'parent_reviewed' : 'submitted', note: 'ข้อมูลสมมติ', timestamp: doneAt }]
          : [],
      });
    }
  });
  // งานที่ครูลบช่องออกจากชีทไปแล้ว (ไม่มีคอลัมน์ในชีท) - ต้องไม่โผล่
  tasks.push({ id: 'demo_task_orphan', subject: 'สังคมฯ', task_name: 'งานเก่าที่ครูลบช่องไปแล้ว (ต้องไม่โผล่)', status: 'Todo', created_at: now, updated_at: now, teacher_column_id: 'demo_col_deleted', student_name: studentName, task_type: 'official' });
  return { cols, tasks };
}

/**
 * "งานของฉัน" สมมติ: [วิชา, ชนิด, รายละเอียด, สั่งกี่วันก่อน, ส่งอีกกี่วัน (null = ไม่มี), ทำเสร็จกี่วันก่อน (null = ยังไม่ทำ), ครูให้แก้กี่ครั้ง]
 * มีงานทำเสร็จแล้ว 12 ชิ้น เพื่อให้เห็นการแบ่งหน้า (หน้าละ 10)
 */
const MY_ROWS: [string, MyTask['kind'], string, number, number | null, number | null, number?][] = [
  ['คณิตศาสตร์+เพิ่มเติม', 'homework', 'โจทย์ปัญหาการหาร หน้า 52 ข้อ 1-10', 5, -2, null],
  ['ภาษาไทย', 'in_class', 'คัดลายมือ บทที่ 4 ให้เสร็จ', 1, 0, null, 1],
  ['ภาษาอังกฤษ', 'homework', 'ท่องคำศัพท์ Unit 5 (20 คำ)', 2, 1, null],
  ['วิทยาศาสตร์', 'homework', 'วาดวงจรไฟฟ้าอย่างง่ายลงสมุด', 0, 4, null],
  ['สังคมฯ', 'in_class', 'สรุปเรื่องหน้าที่ของเงิน', 0, null, null],
  ...Array.from({ length: 12 }, (_, i): [string, MyTask['kind'], string, number, number | null, number | null] =>
    [['คณิตศาสตร์+เพิ่มเติม', 'ภาษาไทย', 'ภาษาอังกฤษ', 'วิทยาศาสตร์'][i % 4], i % 3 === 0 ? 'in_class' : 'homework', `งานที่ทำเสร็จแล้ว ชิ้นที่ ${i + 1}`, 20 - i, null, 14 - i]),
];

export function getMyTasksDemo(studentName: string): MyTask[] {
  const now = Date.now();
  const toDate = (daysFromToday: number) => {
    const d = new Date(now + daysFromToday * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return MY_ROWS.map(([subject, kind, detail, assignedAgo, dueIn, doneAgo, rework], i) => ({
    id: `demo_my_${i}`,
    student_name: studentName,
    subject, kind, detail,
    assigned_date: toDate(-assignedAgo),
    ...(dueIn === null ? {} : { due_date: toDate(dueIn) }),
    status: doneAgo === null ? 'todo' : 'done',
    done_at: doneAgo === null ? null : now - doneAgo * DAY,
    rework_count: rework || 0,
    created_at: now - assignedAgo * DAY,
    updated_at: now,
  }));
}
