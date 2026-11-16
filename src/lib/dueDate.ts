// ตัวช่วยเรื่อง "กำหนดส่ง" ของงาน (due_date เก็บเป็น 'YYYY-MM-DD' จากช่องเลือกวันที่)
// ใช้เวลาเครื่อง (เวลาไทย) ไม่ใช้ toISOString ซึ่งเป็นเวลา UTC และจะเพี้ยนไป 1 วันช่วงก่อน 7 โมงเช้า

const DAY_MS = 24 * 60 * 60 * 1000;
const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function parseDue(due: string | undefined | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((due || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** วันที่ตามเวลาเครื่องเป็น 'YYYY-MM-DD' (ไม่ใช้ toISOString ที่เป็นเวลา UTC) */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** อีกกี่วันถึงกำหนดส่ง (0 = วันนี้, ติดลบ = เลยมาแล้ว) หรือ null ถ้าไม่มี/อ่านวันที่ไม่ได้ */
export function daysUntilDue(due: string | undefined | null, now = new Date()): number | null {
  const d = parseDue(due);
  if (!d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / DAY_MS);
}

/** 'ศ. 13 พ.ย.' (อ่านไม่ได้ = คืนข้อความเดิม) */
export function thaiShortDate(due: string | undefined | null): string {
  const d = parseDue(due);
  if (!d) return due || '';
  return `${TH_DAYS[d.getDay()]} ${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
}

/**
 * วันที่ครูสั่งงาน (ms, เวลาเที่ยงคืนตามเครื่อง) หาได้จาก 3 ที่ เรียงตามความน่าเชื่อถือ:
 * 1) "วันที่มอบหมาย" ที่กรอกเองในการ์ดงาน (YYYY-MM-DD)
 * 2) วันที่ที่ครูเขียนไว้ในชื่องาน เช่น "แบบฝึกหัด 6.4 (6/11/2569)" - ปี พ.ศ. แปลงเป็น ค.ศ. ให้
 * 3) วันที่ระบบเห็นงานนี้ในชีตครูครั้งแรก (first_seen_at)
 * ไม่มีเลย -> 0
 */
export function assignedAt(opts: { assignedDate?: string | null; taskName?: string | null; firstSeenAt?: number | null }): number {
  const fromField = parseDue(opts.assignedDate);
  if (fromField) return fromField.getTime();
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(opts.taskName || '');
  if (m) {
    let y = Number(m[3]);
    if (y > 2400) y -= 543;
    const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d.getTime()) && d.getDate() === Number(m[1])) return d.getTime();
  }
  return opts.firstSeenAt || 0;
}

export type DueTone = 'overdue' | 'soon' | 'later';

/** ป้ายบนการ์ด: เลยกำหนด / ส่งวันนี้ / ส่งพรุ่งนี้ / อีก N วัน */
export function dueBadge(days: number): { label: string; tone: DueTone } {
  if (days < 0) return { label: `เลยกำหนด ${-days} วัน`, tone: 'overdue' };
  if (days === 0) return { label: 'ส่งวันนี้', tone: 'soon' };
  if (days === 1) return { label: 'ส่งพรุ่งนี้', tone: 'soon' };
  return { label: `อีก ${days} วัน`, tone: 'later' };
}
