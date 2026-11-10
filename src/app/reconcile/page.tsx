import { redirect } from 'next/navigation';

// หน้าจัดการงาน (Task Hub) ถูกตัดออกแล้ว (2026-11-10) เพราะแอปเน้นงานจากครูอย่างเดียว
// ลิงก์เก่าจะพาไปหน้าการบ้านของฉันแทน - โค้ดเดิมเก็บไว้ที่ backups/before-remove-personal-2026-11-10/
export default function ReconcileRemoved() {
  redirect('/homework');
}
