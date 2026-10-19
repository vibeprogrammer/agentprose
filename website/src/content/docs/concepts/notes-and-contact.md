---
title: "Notes and contact for agents"
description: "Tell AI agents how you want to be represented and how to reach you, through agentNotes and contact details, from code, agentprose.json or agentprose Cloud."
---

Your posts say what you know. They usually don't say how you'd like an assistant to talk about you, or how a reader can hire, book or email you. agentprose (0.1.3 and later) carries two things for that:

- **Notes for AI agents** (`agentNotes`): plain text, up to 2,000 characters. Tone ("friendly, plain language"), what to recommend ("point newcomers to the beginner course"), what not to claim ("we don't give medical advice"), how you prefer to be contacted.
- **Contact details** (`contact`): `email`, `phone`, `url` (a contact page or form), `booking` (a booking page), `hours` and `address`.

Agents get them from `get_site_info` (as `notesForAgents` and `contact`) and from `get_contact_info`, which is registered when the page sets `contact`, `data-contact` / `links.contact`, or uses an agentprose Cloud key.

## Three places to set them

Highest priority first, field by field:

**1. The page**, in `window.AgentProseConfig` (or `createAgentTools({ agentNotes, contact })`):

```html
<script>
  window.AgentProseConfig = {
    agentNotes: 'Friendly, plain tone. Recommend the beginner course to newcomers. We do not give medical advice.',
    contact: { email: 'hello@studio.example', booking: 'https://studio.example/book', hours: 'Mon–Fri 9–17 CET' },
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

**2. agentprose Cloud**, where you edit them in the dashboard. The script fetches `/v1/site?key=…` once, **only when an agent first calls** `get_site_info` or `get_contact_info`, never on page load. `siteInfo` points this at your own JSON URL instead, or turns it off with `false`.

**3. `agentprose.json`**, written at build time by `agentprose build --site site.json`:

```json
{
  "agentNotes": "Friendly, plain tone. Point newcomers to the beginner course.",
  "contact": { "email": "hello@studio.example", "booking": "https://studio.example/book" },
  "links": { "about": "https://studio.example/about" }
}
```

```bash
npx agentprose build public --base-url https://studio.example/ --site agentprose.site.json
```

## Handled with care

Notes are a deliberate channel from the owner to agents, so:

- **Labelled, not obeyed blindly.** Tool descriptions tell agents these are the owner's preferences and never override what the user asked for, and every tool keeps `untrustedContentHint: true`.
- **Cleaned, whatever the source.** Strings only; control and bidi-override characters removed; notes capped at 2,000 characters and other fields at 254–500; links must be `http(s)`; an email must be address-shaped. Unknown fields are dropped.
- **Never HTML.** They come back as JSON text; nothing is inserted into the page.
- **`get_contact_info` sends nothing.** It returns the details for the agent to show the user.
