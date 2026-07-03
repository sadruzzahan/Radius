import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const helperPath = fileURLToPath(new URL("../../../ml_service/scripts/phash_stdin.py", import.meta.url));

function fallbackHash(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

async function phashFromMl(buffer, mimeType) {
  const form = new FormData();
  form.append("image", new Blob([buffer], { type: mimeType }), "listing-image");
  const response = await fetch(`${config.mlServiceUrl}/image/phash`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`pHash service ${response.status}`);
  const data = await response.json();
  if (!/^[0-9a-f]{16}$/i.test(data.hash ?? "")) throw new Error("Invalid pHash response");
  return data.hash.toLowerCase();
}

async function phashFromPython(buffer) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [helperPath], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let error = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      error += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const hash = output.trim().toLowerCase();
      if (code === 0 && /^[0-9a-f]{16}$/.test(hash)) return resolve(hash);
      reject(new Error(error || "Python pHash helper failed"));
    });
    child.stdin.end(buffer);
  });
}

export async function computeImageHash(buffer, mimeType) {
  try {
    return await phashFromMl(buffer, mimeType);
  } catch {
    try {
      return await phashFromPython(buffer);
    } catch {
      return fallbackHash(buffer);
    }
  }
}
