// กติกากลางของงานจากครู - ใช้ร่วมกันทุกหน้า (งานค้างจากครู / งานทั้งหมด / ภาพรวม)
//
// ขั้นตอนงาน:
//   ครูสั่งงาน (มีเด็กอย่างน้อย 1 คนถูกติ๊กในชีต) -> เด็ก "ยังไม่ทำ"
//   -> เด็กกด "ทำเสร็จแล้ว" = รอครูติ๊ก (เราตรวจไม่ได้ว่าส่งจริงไหม รู้ได้จากติ๊กครูเท่านั้น)
//   -> ครูติ๊กในชีต = จบงาน
// ถ้ากดทำเสร็จแล้วผ่านไป WAIT_ALERT_DAYS วันครูยังไม่ติ๊ก ให้เตือน (อาจยังไม่ได้ส่ง หรือส่งแล้วแต่ต้องแก้)
import { ChildTask } from './db';

export const WAIT_ALERT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** เด็กกด "ทำเสร็จแล้ว" แล้ว และกำลังรอครูติ๊ก ('Done' คือสถานะจากระบบเดิมที่แยกจังหวะ "รอส่ง" ไว้ - นับรวมด้วย) */
export function isWaitingForTeacher(task: ChildTask | undefined | null): boolean {
  return !!task && (task.status === 'Submitted' || task.status === 'Done');
}

function toMillis(v: unknown): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const t = v as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}

/**
 * เวลาที่เด็กกด "ทำเสร็จแล้ว" ครั้งล่าสุด (ms)
 * ดูจากประวัติ (submitted / parent_reviewed) ก่อน ถ้าไม่มีประวัติใช้ updated_at แทน
 */
export function waitingSince(task: ChildTask): number {
  const history = task.revision_history || [];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.action === 'submitted' || h.action === 'parent_reviewed') return h.timestamp;
  }
  return toMillis(task.updated_at) || toMillis(task.created_at);
}

/** รอครูติ๊กมาแล้วกี่วัน (นับเต็มวัน) */
export function waitingDays(task: ChildTask, now = Date.now()): number {
  const since = waitingSince(task);
  if (!since) return 0;
  return Math.max(0, Math.floor((now - since) / DAY_MS));
}

/** รอครูติ๊กครบ WAIT_ALERT_DAYS วันแล้ว -> ต้องเตือน */
export function isWaitTooLong(task: ChildTask, now = Date.now()): boolean {
  return isWaitingForTeacher(task) && waitingDays(task, now) >= WAIT_ALERT_DAYS;
}
