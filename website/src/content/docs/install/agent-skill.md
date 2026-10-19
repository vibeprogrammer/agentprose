---
title: "Agent skill"
description: "Install the agentprose skill so coding agents like Claude Code, Codex, Cursor and Copilot add agentprose to a site the right way."
---

The repository ships an [agent skill](https://github.com/webmaxru/agentprose/tree/main/skills/agentprose) that teaches coding agents to add agentprose to a site the right way. It works with Claude Code, Codex, Cursor, Copilot and other agents that read skills.

```bash
npx skills add webmaxru/agentprose
```

Then ask your agent something like:

> Make this site readable by AI agents with agentprose.

## What the skill does

1. **Finds the platform.** Static generator output (Hugo, Jekyll, Astro, Eleventy, Next.js, Gatsby, Docusaurus) or plain HTML gets the script tag in the shared layout; WordPress gets the plugin or the script tag; Ghost and headless CMSs get `data-adapter` with the adapter's attributes; JavaScript apps get `npm install agentprose` and `createAgentTools()`.
2. **Adds it.** The tag goes in the shared layout, with only the attributes the site needs.
3. **Builds a static index** with `npx agentprose build` for large static sites, including notes for agents and contact details if you give them.
4. **Keeps your Content Security Policy working**: jsDelivr, self-hosting or the Cloud, with the right `script-src` and `connect-src`.
5. **Verifies**: runs `npx agentprose inspect` on an article, opens it with `?agentprose-inspect`, and checks the console.

## Rules it follows

- It doesn't change how the site looks or behaves for people.
- It never puts a secret in the page. Only public keys belong in `data-*` attributes (an agentprose Cloud `pk_…` key, a Ghost Content API key, a Contentful delivery token, a Storyblok public token).
- It asks before signing you up for anything or adding an analytics endpoint. agentprose Cloud is optional.
- It tells you what it added, where, and how to switch it off.
