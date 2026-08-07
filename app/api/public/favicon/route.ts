/* eslint-disable */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const res = await query(`SELECT value FROM setting WHERE key = $1`, ["CONFIG_APP"]);
    let logoUrl = "";
    let namaAplikasi = "Absensi Sekolah";
    let primaryColor = "#0FBE85";

    if (res.rows.length > 0 && res.rows[0].value) {
      const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
      if (val.logoUrl) logoUrl = val.logoUrl;
      if (val.namaAplikasi) namaAplikasi = val.namaAplikasi;
    }

    const themeRes = await query(`SELECT value FROM setting WHERE key = $1`, ["CONFIG_THEME"]);
    if (themeRes.rows.length > 0 && themeRes.rows[0].value) {
      const val = typeof themeRes.rows[0].value === "string" ? JSON.parse(themeRes.rows[0].value) : themeRes.rows[0].value;
      if (val.primaryColor) primaryColor = val.primaryColor;
    }

    let imageTag = "";
    if (logoUrl) {
      try {
        const imgRes = await fetch(logoUrl);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "image/png";
          const arrayBuffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const dataUri = `data:${contentType};base64,${base64}`;
          imageTag = `<image href="${dataUri}" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle-clip)"/>`;
        }
      } catch (e) {
        // Fallback if external fetch fails
      }
    }

    if (!imageTag) {
      const initial = namaAplikasi.charAt(0).toUpperCase() || "S";
      imageTag = `
        <circle cx="50" cy="50" r="50" fill="${primaryColor}"/>
        <text x="50" y="58" font-size="45" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">${initial}</text>
      `;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <clipPath id="circle-clip">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <circle cx="50" cy="50" r="50" fill="${primaryColor}" opacity="0.1"/>
  ${imageTag}
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="50" fill="#0FBE85"/>
  <text x="50" y="58" font-size="45" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">S</text>
</svg>`;
    return new NextResponse(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }
}
