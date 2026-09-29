import JSZip from "jszip";

export async function downloadProjectZip() {
  const zip = new JSZip();

  zip.file(
    "AeroTwin_Project.txt",
    "AeroTwin - AI Enabled Real-Time Digital Twin for MALE UAV Aero Piston Engines"
  );

  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "AeroTwin-Project.zip";
  link.click();

  URL.revokeObjectURL(url);
}