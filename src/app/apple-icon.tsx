import { ImageResponse } from 'next/og';

// ไอคอนตอน "เพิ่มไปยังหน้าจอโฮม" บน iPhone / iPad: จรวดบนพื้นสีน้ำเงินของเว็บ
// วาดด้วย SVG เอง (ไม่ต้องโหลดรูป emoji จากภายนอก) สร้างครั้งเดียวตอน build
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const ROCKET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
  <g transform="rotate(45 50 50) translate(50 52) scale(0.92) translate(-50 -52)">
    <path d="M42 68 C42 79 46 85 50 95 C54 85 58 79 58 68 Z" fill="#f59e0b"/>
    <path d="M46 68 C46 75 48 80 50 86 C52 80 54 75 54 68 Z" fill="#fde047"/>
    <rect x="41" y="61" width="18" height="8" rx="2.5" fill="#94a3b8"/>
    <path d="M37 47 L23 64 L23 73 L38 65 Z" fill="#ef4444"/>
    <path d="M63 47 L77 64 L77 73 L62 65 Z" fill="#ef4444"/>
    <path d="M50 8 C63 21 67 38 65 63 L35 63 C33 38 37 21 50 8 Z" fill="#ffffff"/>
    <path d="M50 8 C56 14 60 21 62 28 L38 28 C40 21 44 14 50 8 Z" fill="#ef4444"/>
    <circle cx="50" cy="42" r="7.5" fill="#597ecf" stroke="#dbe5f7" stroke-width="3"/>
    <path d="M50 52 L50 63" stroke="#e2e8f0" stroke-width="2"/>
  </g>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6f92e0 0%, #597ecf 45%, #434c60 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(ROCKET_SVG)}`}
          width={150}
          height={150}
          alt=""
        />
      </div>
    ),
    { ...size }
  );
}
