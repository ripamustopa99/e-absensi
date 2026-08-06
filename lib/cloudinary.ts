import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function deleteCloudinaryImage(url: string) {
  if (!url || !url.includes("cloudinary.com")) return;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return;
    let pathPart = parts[1];
    if (pathPart.startsWith("v")) {
      const slashIdx = pathPart.indexOf("/");
      if (slashIdx !== -1) {
        pathPart = pathPart.substring(slashIdx + 1);
      }
    }
    const lastDotIdx = pathPart.lastIndexOf(".");
    if (lastDotIdx !== -1) {
      pathPart = pathPart.substring(0, lastDotIdx);
    }
    if (pathPart) {
      await cloudinary.uploader.destroy(pathPart);
    }
  } catch (err) {
    console.error("Failed to delete old image from Cloudinary:", err);
  }
}

export default cloudinary;
