// แสดงระหว่างรอรู้ชื่อนักเรียน (อ่านจากเครื่อง/Firestore) แทนหน้า "กรุณาตั้งค่าชื่อ"
// กันไม่ให้หน้าตั้งค่าโผล่ขึ้นมาชั่วคราวตอนสลับหน้าหรือเน็ตช้า
export default function NameLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 print:hidden">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
      <p className="text-sm text-gray-500">กำลังโหลด...</p>
    </div>
  );
}
