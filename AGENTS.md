# HW Tracker Project Guidelines

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Guidelines
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI Design Guidelines

### 1. Standard Page Header Pattern (ยึดมาตรฐานจากหน้า "การบ้านของฉัน" /homework)
ทุกหน้าในโปรเจกต์นี้ต้องใช้โครงสร้างกล่องหัวข้อหน้า (Page Header Card) ตามแบบมาตรฐานของหน้า **การบ้านของฉัน (`/homework`)**:

* **กรอบการ์ดสีขาว (White Header Card Container)**: ใช้ `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4">`
* **โครงสร้างและลำดับ**:
  1. **ไอคอนประจำหน้า (Icon)**: วางหน้าชื่อเรื่อง ขนาด `w-6 h-6 text-gray-400 mr-2 shrink-0`
  2. **ชื่อเรื่องหลัก (Title)**: `h1` ขนาด `text-2xl sm:text-3xl font-bold text-gray-900 flex items-center` ในรูปแบบ `ชื่อภาษาไทย (English Name)`
  3. **คำอธิบายหน้า (Subtitle)**: `p` ขนาด `text-gray-500 mt-1 text-sm sm:text-base`
  4. **ปุ่มการกระทำและตัวกรอง (Action Buttons / Filters)**: วางอยู่ฝั่งขวามือภายในกล่องการ์ดเดียวกัน (`flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto`)

**ตัวอย่างโค้ดมาตรฐาน (JSX Template จาก /homework):**
```tsx
{/* Header section */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4">
  <div>
    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
      <BookOpen className="w-6 h-6 text-gray-400 mr-2 shrink-0" />
      การบ้านของฉัน (Home Work)
    </h1>
    <p className="text-gray-500 mt-1 text-sm sm:text-base">บันทึกและติดตามงานของคุณได้ที่นี่</p>
  </div>
  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
    {/* Action buttons and filter dropdowns */}
  </div>
</div>
```
