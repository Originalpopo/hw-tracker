# HW Tracker Project Guidelines

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Guidelines
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI Design Guidelines

### 1. Typography Standard (Google Fonts Thai: Noto Sans Thai + Inter)
All text elements across the app must strictly follow the **6-Level Semantic Typography Scale**:
1. **Page Title (`h1`)**: `text-2xl sm:text-3xl font-bold tracking-tight text-gray-900` (or `text-page-title`)
2. **Section Header (`h2`)**: `text-lg sm:text-xl font-bold text-gray-900` (or `text-section-title`)
3. **Card Title (`h3`)**: `text-base font-semibold text-gray-900` (or `text-card-title`)
4. **Body Text (`p`, `span`)**: `text-sm font-normal text-gray-700` (or `text-body`)
5. **Subtitle / Muted (`p`, `span`)**: `text-xs sm:text-sm text-gray-500` (or `text-sub`)
6. **Badge / Caption / Metadata (`span`)**: `text-[10px] sm:text-xs font-bold uppercase tracking-wider` (or `text-badge`)

### 2. Standard Page Header Pattern (Based on `/homework` standard)
All pages in this project must adhere to the standard Page Header Card structure established in the **My Homework (`/homework`)** page:

* **White Header Card Container**: Use `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">`
* **Structure and Order**:
  1. **Page Icon**: Placed before the title, styled with `w-6 h-6 text-[#597ecf] mr-2 shrink-0`
  2. **Main Title**: `h1` styled with `text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center` formatted as `Thai Name (English Name)`
  3. **Page Subtitle**: `p` styled with `text-gray-500 mt-1 text-sm sm:text-base`
  4. **Action Buttons / Filters**: Positioned on the right side within the same card container (`flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto`)

**Standard Code Example (JSX Template from `/homework`):**
```tsx
{/* Header section */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">
  <div>
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
      <BookOpen className="w-6 h-6 text-[#597ecf] mr-2 shrink-0" />
      การบ้านของฉัน (Home Work)
    </h1>
    <p className="text-gray-500 mt-1 text-sm sm:text-base">บันทึกและติดตามงานของคุณได้ที่นี่</p>
  </div>
  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
    {/* Action buttons and filter dropdowns */}
  </div>
</div>
```

### 3. Shared UI Components (`src/components/ui/`)
- Always place and reuse shared components in `src/components/ui/` (Buttons, Badges, Cards, Inputs, Modals).
- Do NOT write random ad-hoc sizing or mix conflicting color palettes across pages.

### 4. Color Palette Tokens (Realtime Colors)
- **Source**: `https://www.realtimecolors.com/dashboard?colors=000000-f4f7fa-597ecf-878787-57627a&fonts=Inter-Inter`
- **Tokens**:
  - **Text**: `#000000` (`--color-text`)
  - **Background**: `#f4f7fa` (`--color-background`)
  - **Primary**: `#597ecf` (Royal Steel Blue) (`--color-primary`, hover `#486cb8`, light `#eef3fc`)
  - **Secondary**: `#878787` (Neutral Slate) (`--color-secondary`, light `#f1f3f6`)
  - **Accent**: `#57627a` (Deep Slate Navy) (`--color-accent`, hover `#434c60`, light `#eff2f7`)
  - **Surface/Card**: `#ffffff` (`--color-surface`)
  - **Border**: `#e2e8f0` (`--color-border`)

## Verification & Subagent Policy
- **No Automated Browser Subagent**: Do NOT use `browser_subagent` for UI verification in `hw-tracker` to keep development fast and responsive.
- **Direct User Verification**: Validate code correctness via dev server compilation logs (Turbopack) and let the user preview changes directly at `http://localhost:3000`.
