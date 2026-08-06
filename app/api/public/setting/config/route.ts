/* eslint-disable */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const res = await query(`SELECT key, value FROM setting WHERE key IN ('CONFIG_APP', 'CONFIG_THEME')`);
    let namaAplikasi = "Absensi Sekolah";
    let titleTab = "";
    let logoUrl = "";
    let primaryColor = "#0FBE85";
    let brightnessMode = "light";
    let defaultLightVariant = "light";
    let defaultDarkVariant = "dark";

    for (const row of res.rows) {
      if (row.key === "CONFIG_APP" && row.value) {
        const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
        if (val.namaAplikasi) namaAplikasi = val.namaAplikasi;
        if (val.titleTab) titleTab = val.titleTab;
        if (val.logoUrl) logoUrl = val.logoUrl;
      }
      if (row.key === "CONFIG_THEME" && row.value) {
        const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
        if (val.primaryColor) primaryColor = val.primaryColor;
        if (val.brightnessMode) brightnessMode = val.brightnessMode;
        if (val.defaultLightVariant) defaultLightVariant = val.defaultLightVariant;
        if (val.defaultDarkVariant) defaultDarkVariant = val.defaultDarkVariant;
      }
    }

    return NextResponse.json({
      success: true,
      namaAplikasi,
      titleTab,
      logoUrl,
      primaryColor,
      brightnessMode,
      defaultLightVariant,
      defaultDarkVariant,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      namaAplikasi: "Absensi Sekolah",
      titleTab: "",
      logoUrl: "",
      primaryColor: "#0FBE85",
      brightnessMode: "light",
      defaultLightVariant: "light",
      defaultDarkVariant: "dark",
    });
  }
}
