import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// VertexAI has been removed in favor of OpenRouter / Local strategies.
// Using simple hash embedding as a lightweight fallback for similarity checks.

export async function getEmbedding(text) {
  // Directly use the fallback for now as we have removed google-cloud dependency
  return simpleHashEmbedding(text);
}


export function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function simpleHashEmbedding(text) {
  const words = String(text || '').toLowerCase().split(/\s+/);
  const dim = 128;
  const vec = new Array(dim).fill(0);
  for (const w of words) { const h = simpleHash(w); vec[h % dim] += 1; }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

function simpleHash(str) {
  let h = 0; const s = String(str);
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}


