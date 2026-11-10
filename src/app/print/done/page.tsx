import { redirect } from 'next/navigation';

// ใบ "งานรอส่ง" ถูกรวมเข้ากับใบ "งานรอครูติ๊ก" แล้ว (2026-11-10)
// เพราะขั้นตอนใหม่ไม่มีจังหวะ "รอส่ง" แยก - กด "ทำเสร็จแล้ว" คือรอครูติ๊กทันที
// โค้ดเดิมเก็บไว้ที่ backups/before-print-update-2026-11-10/
export default function PrintDoneMoved() {
  redirect('/print/submitted');
}
