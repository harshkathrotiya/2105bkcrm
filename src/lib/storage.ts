import fs from "node:fs/promises";
import path from "node:path";

/**
 * Uploads a file (Base64 data url or raw base64 string) to the local public/uploads directory.
 * Returns the public URL path to access the file.
 */
export async function uploadFile(base64Data: string, filename: string): Promise<string> {
  try {
    // If it's a data URL, extract the base64 part
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let base64String = base64Data;
    if (matches && matches.length === 3) {
      base64String = matches[2];
    }

    const buffer = Buffer.from(base64String, "base64");
    
    // Define the upload directory inside public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Clean filename to prevent path traversal
    const cleanFilename = `${Date.now()}-${path.basename(filename).replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const filePath = path.join(uploadDir, cleanFilename);
    
    await fs.writeFile(filePath, buffer);
    
    // Return public relative path
    return `/uploads/${cleanFilename}`;
  } catch (err) {
    console.error("Failed to upload file:", err);
    throw new Error("File upload failed");
  }
}
