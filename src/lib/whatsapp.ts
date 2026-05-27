import fs from "node:fs/promises";
import path from "node:path";

/**
 * Simulates sending a WhatsApp template brief.
 * Logs the message to console and appends it to public/whatsapp-simulation.log.
 */
export async function sendWhatsAppBrief(
  staffName: string,
  phone: string,
  messageText: string
): Promise<boolean> {
  const timestamp = new Date().toLocaleString("en-IN");
  const logEntry = `
========================================
[WHATSAPP SIMULATION - SENT AT ${timestamp}]
To: ${staffName} (${phone})
Message:
${messageText.trim()}
========================================
`;

  console.log(logEntry);

  try {
    const publicDir = path.join(process.cwd(), "public");
    await fs.mkdir(publicDir, { recursive: true });
    
    const logPath = path.join(publicDir, "whatsapp-simulation.log");
    await fs.appendFile(logPath, logEntry, "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write to WhatsApp simulation log:", err);
    return false;
  }
}
