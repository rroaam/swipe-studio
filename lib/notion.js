// Phase 3: push an approved deck to the Notion Carousel Drafts DB.
// DB props: Name(title) · Status(select) · Brand(select) · Slide Count(number) · Slides JSON(rich_text)
import { readFileSync } from 'fs';
import path from 'path';
import os from 'os';

function fromEnvFile(key) {
  try {
    const line = readFileSync(path.join(os.homedir(), 'content-engine/.env'), 'utf8')
      .split('\n').find((l) => l.startsWith(key + '='));
    if (line) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '');
  } catch { /* ignore */ }
  return null;
}
export function notionToken() { return process.env.NOTION_TOKEN || fromEnvFile('NOTION_TOKEN'); }
export function carouselDb() { return process.env.NOTION_CAROUSEL_DRAFTS_DB || fromEnvFile('NOTION_CAROUSEL_DRAFTS_DB'); }
export function notionConfigured() { return Boolean(notionToken() && carouselDb()); }

const rt = (s) => [{ type: 'text', text: { content: String(s).slice(0, 1900) } }];

export async function pushToNotion(deck) {
  const token = notionToken();
  const db = carouselDb();
  if (!token || !db) throw new Error('Notion token / Carousel Drafts DB id not configured');

  const copy = Array.isArray(deck.copy) ? deck.copy : [];
  const children = [
    { object: 'block', type: 'heading_2', heading_2: { rich_text: rt(`${deck.title} — ${deck.format || 'carousel'} · ${deck.accent} · ${deck.w}×${deck.h}`) } },
    ...copy.map((s) => ({
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: rt(
        `Slide ${s.n}${s.label ? ` [${s.label}]` : ''}\n` +
        (s.header ? `Header: ${s.header}\n` : '') +
        (s.body ? `Body: ${s.body}\n` : '') +
        (s.pill ? `CTA: ${s.pill}` : '')) },
    })),
  ];

  const body = {
    parent: { database_id: db },
    properties: {
      Name: { title: rt(deck.title || deck.name) },
      Status: { select: { name: deck.status === 'approved' ? 'Approved' : 'Draft' } },
      Brand: { select: { name: 'r0am' } },
      'Slide Count': { number: deck.rendered ?? (deck.slides?.length || 0) },
      'Slides JSON': { rich_text: rt(JSON.stringify(copy)) },
    },
    children: children.slice(0, 100),
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `notion ${res.status}`);
  return { id: data.id, url: data.url };
}
