import type { Contact } from './types';

/**
 * Owner-provided site details for agents: "notes for AI agents" and contact/booking details, from the page
 * config, agentprose.json or an agentprose Cloud. Whatever the source, only strings are kept, control and
 * bidi-override characters are removed, lengths are capped and links must be http(s).
 */
const KEYS = ['email', 'phone', 'url', 'booking', 'hours', 'address'] as const;

export const cleanText = (v: unknown, max: number): string | undefined =>
  (typeof v == 'string' && v.replace(/[\0-\x09\x0b-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, ' ').trim().slice(0, max)) || undefined;

export function cleanContact(c: any): Contact | undefined {
  const o: any = {};
  for (const k of KEYS) {
    const v = cleanText(c?.[k], k == 'email' || k == 'phone' ? 254 : 500);
    if (v && (k == 'url' || k == 'booking' ? /^https?:\/\/[^\s]+$/i.test(v) : k == 'email' ? /^[^\s@]+@[^\s@]+$/.test(v) : 1)) o[k] = v;
  }
  return Object.keys(o).length ? o : undefined;
}

/** Field by field, the first source that has a value wins: page config, then the Cloud, then agentprose.json. */
export function mergeOwner(...srcs: any[]) {
  let notes: string | undefined;
  const contact: Contact = {};
  for (const s of srcs.reverse()) {
    notes = cleanText(s?.agentNotes, 2000) || notes;
    Object.assign(contact, cleanContact(s?.contact));
  }
  return { notesForAgents: notes, contact: Object.keys(contact).length ? contact : undefined };
}
