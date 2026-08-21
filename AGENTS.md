# HW Tracker Project Guidelines

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Guidelines
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI Design Guidelines

### 1. Standard Page Header Pattern (Based on `/homework` standard)
All pages in this project must adhere to the standard Page Header Card structure established in the **My Homework (`/homework`)** page:

* **White Header Card Container**: Use `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4">`
* **Structure and Order**:
  1. **Page Icon**: Placed before the title, styled with `w-6 h-6 text-gray-400 mr-2 shrink-0`
  2. **Main Title**: `h1` styled with `text-2xl sm:text-3xl font-bold text-gray-900 flex items-center` formatted as `Thai Name (English Name)`
  3. **Page Subtitle**: `p` styled with `text-gray-500 mt-1 text-sm sm:text-base`
  4. **Action Buttons / Filters**: Positioned on the right side within the same card container (`flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto`)

**Standard Code Example (JSX Template from `/homework`):**
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
