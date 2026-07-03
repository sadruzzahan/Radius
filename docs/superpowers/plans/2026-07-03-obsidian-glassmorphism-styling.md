# Obsidian Glassmorphism & Cyber-Glow Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the NeighborTrust client styling to implement a premium, dark-mode glassmorphic theme with glowing neon-mint/emerald highlights, Outfit typography, and updated WebGL radar colors.

**Architecture:** 
- Apply global CSS custom variables to `:root` to establish a dark obsidian theme.
- Replace core styles for structural components (sidebar, cards, drawers, forms, chat) with semi-translucent backdrops, blurred glass panels, and active emerald hover states.
- Modify `App.jsx`'s WebGL (Three.js) and 2D canvas fallbacks to match the neon cyber-radar color scheme.

**Tech Stack:** React 19, Three.js, Framer Motion, Vanilla CSS (Outfit Font from Google Fonts).

---

### Task 1: CSS Redesign Implementation

**Files:**
- Modify: `/root/hyperlocal-marketplace/client/src/styles.css`

- [ ] **Step 1: Replace styles.css with premium glassmorphic dark theme styles**
Overwrite `/root/hyperlocal-marketplace/client/src/styles.css` entirely with the following complete styled ruleset:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;850&display=swap');

:root {
  font-family: 'Outfit', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #f8fafc;
  background: #080c14;
  --bg: #080c14;
  --bg-gradient: radial-gradient(circle at 50% 50%, #0d1527 0%, #06090f 100%);
  --ink: #f8fafc;
  --graphite: #111827;
  --muted: #94a3b8;
  --line: rgba(255, 255, 255, 0.08);
  --line-active: rgba(0, 245, 160, 0.35);
  --panel: rgba(15, 23, 42, 0.55);
  --panel-solid: #0f172a;
  --soft: #080c14;
  --accent: #00f5a0;
  --accent-gradient: linear-gradient(135deg, #00f5a0 0%, #0c7a5a 100%);
  --accent-2: #38bdf8;
  --accent-2-gradient: linear-gradient(135deg, #38bdf8 0%, #0369a1 100%);
  --alert: #f87171;
  --gold: #fbbf24;
  --shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
  --glass-blur: blur(20px);
}

* { box-sizing: border-box; }
body { 
  margin: 0; 
  min-width: 320px; 
  background: var(--bg); 
  background-image: var(--bg-gradient);
  min-height: 100vh;
}

/* Custom Sleek Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.3);
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 245, 160, 0.3);
}

/* Custom Text Selection */
::selection {
  background: rgba(0, 245, 160, 0.25);
  color: #ffffff;
}

button, input, select, textarea { font: inherit; }
button {
  border: 0;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 10px 15px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  min-height: 40px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
button:hover:not(:disabled) { 
  transform: translateY(-2px); 
  background: rgba(0, 245, 160, 0.1); 
  border-color: var(--accent);
  box-shadow: 0 0 15px rgba(0, 245, 160, 0.2); 
}
button:disabled { opacity: .35; cursor: not-allowed; }

input, select, textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.65);
  color: var(--ink);
  min-height: 42px;
  outline: none;
  transition: all 0.2s ease;
}
input:focus, select:focus, textarea:focus { 
  border-color: var(--accent); 
  box-shadow: 0 0 0 3px rgba(0, 245, 160, 0.15); 
  background: rgba(15, 23, 42, 0.8);
}
select option {
  background: #0f172a;
  color: var(--ink);
}
textarea { min-height: 132px; resize: vertical; }

h1, h2, h3, p { margin-top: 0; }
h1 { font-size: clamp(30px, 4vw, 52px); line-height: 1.05; margin-bottom: 10px; font-weight: 700; }
h2 { font-size: 22px; margin: 22px 0 12px; font-weight: 600; color: var(--accent-2); }
h3 { font-size: 17px; margin-bottom: 6px; font-weight: 500; }
a { color: var(--accent-2); text-decoration: none; }
a:hover { text-decoration: underline; }

.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.shell { display: grid; grid-template-columns: 272px minmax(0, 1fr); min-height: 100vh; }

.sidebar {
  background: rgba(9, 14, 25, 0.75);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--ink);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid var(--line);
}
.brand { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  font-size: 21px; 
  font-weight: 850; 
  margin-bottom: 24px; 
  color: var(--accent);
  text-shadow: 0 0 10px rgba(0, 245, 160, 0.25);
}
.nav-stack { display: grid; gap: 8px; }
.sidebar button { 
  background: transparent; 
  justify-content: flex-start; 
  border: 1px solid transparent; 
  box-shadow: none; 
  transition: all 0.2s ease;
  font-weight: 500;
}
.sidebar button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}
.sidebar button.active { 
  background: var(--accent-gradient); 
  color: #080c14; 
  border-color: var(--accent);
  box-shadow: 0 4px 15px rgba(0, 245, 160, 0.25);
  font-weight: 700;
}
.sidebar button.active:hover {
  background: var(--accent-gradient);
  color: #080c14;
  transform: none;
  box-shadow: 0 4px 20px rgba(0, 245, 160, 0.35);
}

.session { 
  margin-top: auto; 
  display: grid; 
  gap: 8px; 
  padding-top: 18px; 
  border-top: 1px solid var(--line); 
}
.session-label { color: var(--muted); font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
.session span:last-of-type { color: var(--muted); font-size: 13px; }
.session button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--line);
}

.workspace { padding: 24px; overflow: hidden; }
.page { max-width: 1500px; margin: 0 auto; }

.notice {
  background: rgba(0, 245, 160, 0.1);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 12px;
  border-radius: 8px;
  margin: 0 auto 16px;
  width: min(100%, 1500px);
  justify-content: flex-start;
  backdrop-filter: var(--glass-blur);
  display: flex;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0, 245, 160, 0.08);
}
.notice:hover {
  background: rgba(0, 245, 160, 0.15);
  transform: none;
}
.error, .state-block.error { 
  background: rgba(248, 113, 113, 0.1); 
  border-color: var(--alert); 
  color: var(--alert); 
  box-shadow: 0 4px 20px rgba(248, 113, 113, 0.08);
}

.market-hero {
  min-height: 340px;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(340px, .98fr);
  gap: 28px;
  align-items: stretch;
  margin-bottom: 24px;
}
.hero-copy-block {
  min-height: 340px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.eyebrow { 
  color: var(--accent); 
  display: flex; 
  align-items: center; 
  gap: 7px; 
  font-weight: 850; 
  margin-bottom: 12px; 
  font-size: 13px; 
  text-transform: uppercase; 
  letter-spacing: 0.06em;
}
.hero-copy { color: var(--muted); max-width: 720px; line-height: 1.6; font-size: 16px; }
.hero-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.hero-stats span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  background: rgba(15, 23, 42, 0.45);
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 14px;
}
.hero-stats strong { color: var(--accent); }

.trust-scene {
  min-height: 340px;
  border: 1px solid var(--line);
  background: 
    radial-gradient(circle at 70% 30%, rgba(0, 245, 160, 0.05), transparent 60%),
    rgba(15, 23, 42, 0.35);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow);
  backdrop-filter: var(--glass-blur);
}
.trust-scene canvas { position: relative; z-index: 2; display: block; }
.scene-fallback { position: absolute; inset: 0; display: grid; place-items: center; gap: 8px; color: var(--accent); font-weight: 850; z-index: 1; }

.searchbar { display: grid; grid-template-columns: 1fr 48px; gap: 8px; margin-top: 18px; max-width: 608px; }
.searchbar button {
  background: var(--accent-gradient);
  color: #080c14;
  border: none;
}
.searchbar button:hover {
  box-shadow: 0 0 15px rgba(0, 245, 160, 0.35);
}

.filter-rail {
  position: sticky;
  top: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: auto repeat(6, minmax(116px, 1fr));
  gap: 10px;
  margin-bottom: 24px;
  padding: 12px;
  background: rgba(13, 21, 39, 0.7);
  border: 1px solid var(--line);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
.rail-title { display: inline-flex; align-items: center; gap: 7px; font-weight: 850; color: var(--ink); padding: 0 6px; white-space: nowrap; }

.featured-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
.featured-card {
  position: relative;
  min-height: 190px;
  border-radius: 12px;
  overflow: hidden;
  padding: 0;
  justify-content: stretch;
  align-items: stretch;
  text-align: left;
  background: #0f172a;
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}
.featured-card:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 30px rgba(0, 245, 160, 0.15);
}
.featured-card img, .publish-card img, .compact img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }
.featured-card:hover img {
  transform: scale(1.03);
}
.featured-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,12,20,0), rgba(8,12,20,0.92)); }
.featured-content { position: absolute; left: 16px; right: 16px; bottom: 16px; display: grid; gap: 4px; z-index: 2; }
.featured-content span, .featured-content small { color: var(--muted); }
.featured-content strong { color: var(--ink); font-size: 19px; overflow-wrap: anywhere; font-weight: 600; }
.featured-action {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  background: var(--accent-gradient);
  color: #080c14;
  padding: 7px 12px;
  border-radius: 8px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0, 245, 160, 0.25);
  border: none;
}
.featured-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 245, 160, 0.4);
}

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.listing, .panel {
  background: var(--panel);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--line);
  border-radius: 12px;
}
.listing {
  display: grid;
  grid-template-rows: 210px minmax(0, 1fr);
  overflow: hidden;
  min-height: 430px;
  box-shadow: 0 16px 36px rgba(0,0,0,0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.listing:hover {
  transform: translateY(-6px);
  border-color: var(--line-active);
  box-shadow: 0 20px 40px rgba(0, 245, 160, 0.08);
}
.listing.flagged { border-color: rgba(251, 191, 36, 0.4); }
.listing.flagged:hover { border-color: var(--gold); box-shadow: 0 20px 40px rgba(251, 191, 36, 0.08); }
.image {
  position: relative;
  background: linear-gradient(135deg, var(--category-color, #1e293b), #090d16);
  color: var(--ink);
  display: block;
  width: 100%;
  height: 210px;
  min-height: 210px;
  border-radius: 0;
  padding: 0;
  overflow: hidden;
  border: none;
}
.image img { transition: transform 0.4s ease; }
.listing:hover .image img { transform: scale(1.03); }
.image::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.4)); }
.status-chip, .risk-chip {
  position: absolute;
  z-index: 2;
  border-radius: 8px;
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  border: 1px solid var(--line);
}
.status-chip { top: 12px; left: 12px; border-left: 3px solid var(--accent-2); }
.risk-chip { top: 12px; right: 12px; display: inline-flex; align-items: center; gap: 5px; border-left: 3px solid var(--accent); }
.risk-chip.high { border-left-color: var(--alert); color: var(--alert); background: rgba(30, 16, 20, 0.85); }
.listing-body { padding: 18px; display: grid; gap: 12px; min-width: 0; align-content: start; }
.row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.row h3 { margin: 0; overflow-wrap: anywhere; font-size: 18px; font-weight: 600; }
.row strong { white-space: nowrap; color: var(--accent-2); font-size: 18px; }
.listing p, .panel p, .state-block p, .publish-card p { color: var(--muted); line-height: 1.5; margin: 0; }
.listing p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; }
.meta { display: flex; flex-wrap: wrap; gap: 6px; }
.meta span, .pill {
  border: 1px solid var(--line);
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--muted);
  display: inline-flex;
  gap: 5px;
  align-items: center;
  background: rgba(15, 23, 42, 0.4);
}
.risk-meter { position: relative; height: 30px; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.risk-meter span { display: block; height: 100%; background: var(--accent-gradient); transition: width .35s ease; }
.risk-meter.high span { background: linear-gradient(90deg, var(--gold), var(--alert)); }
.risk-meter small { position: absolute; inset: 0; display: flex; align-items: center; gap: 5px; padding: 0 9px; color: var(--ink); font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.actions button { flex: 1; font-size: 13px; }
.actions button:nth-child(odd), .topbar button, .form button[type=button], .queue button:first-of-type, .user-row button, .drawer-close, .compact button:last-child {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
  border: 1px solid var(--line);
}
.actions button:nth-child(odd):hover, .topbar button:hover, .form button[type=button]:hover, .queue button:first-of-type:hover, .user-row button:hover, .drawer-close:hover, .compact button:last-child:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255,255,255,0.2);
}

.panel { padding: 22px; max-width: 980px; box-shadow: 0 20px 45px rgba(0,0,0,0.3); }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.topbar h1, .topbar h2 { margin-bottom: 0; }
.form { display: grid; gap: 14px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.sell-screen { display: grid; gap: 20px; }
.sell-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 420px); gap: 20px; align-items: start; }
.sell-form { max-width: none; }
.stepper { display: flex; flex-wrap: wrap; gap: 8px; }
.stepper button { background: rgba(255, 255, 255, 0.04); color: var(--muted); border: 1px solid var(--line); }
.stepper button.active { background: var(--accent-gradient); color: #080c14; border-color: var(--accent); font-weight: 700; }
.wizard-pane { display: grid; gap: 14px; }
.upload-tile {
  border: 1px dashed rgba(0, 245, 160, 0.35);
  background: linear-gradient(135deg, rgba(15,23,42,0.4), rgba(0, 245, 160, 0.04));
  min-height: 180px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  gap: 6px;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  padding: 24px;
  transition: all 0.2s ease;
}
.upload-tile:hover {
  border-color: var(--accent);
  background: linear-gradient(135deg, rgba(15,23,42,0.6), rgba(0, 245, 160, 0.08));
}
.upload-tile small { color: var(--muted); font-weight: 400; }
.upload-tile input { display: none; }
.upload-progress { height: 8px; background: rgba(15,23,42,0.6); border-radius: 8px; overflow: hidden; }
.upload-progress span { display: block; height: 100%; background: var(--accent-gradient); transition: width .2s ease; }
.preview-strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(112px, 160px); gap: 8px; min-height: 106px; overflow-x: auto; padding-bottom: 4px; }
.preview-strip img { aspect-ratio: 1.25; border-radius: 8px; border: 1px solid var(--line); }
.readiness { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid rgba(251,191,36,0.3); background: rgba(251,191,36,0.06); border-radius: 8px; color: var(--gold); }
.readiness.ready { border-color: rgba(0, 245, 160, 0.3); background: rgba(0, 245, 160, 0.06); color: var(--accent); }
.readiness div { display: grid; gap: 2px; }
.readiness span, .suggestion span { color: var(--muted); }
.suggestion { padding: 14px; border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; background: rgba(56,189,248,0.06); color: var(--accent-2); font-weight: 600; display: grid; gap: 4px; }
.publish-card {
  position: sticky;
  top: 82px;
  display: grid;
  gap: 12px;
  background: var(--panel);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow);
}
.publish-card img { height: 260px; }
.publish-card div { padding: 0 18px 18px; display: grid; gap: 8px; }
.publish-card h3 { margin: 0; overflow-wrap: anywhere; font-size: 19px; }
.publish-card strong { color: var(--accent-2); font-size: 18px; }

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(480px, 100vw);
  height: 100vh;
  z-index: 8;
  background: rgba(8, 12, 21, 0.88);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-left: 1px solid var(--line);
  box-shadow: -25px 0 50px rgba(0,0,0,0.5);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}
.drawer-photo { height: 280px; background: rgba(15,23,42,0.4); border-radius: 8px; display: grid; place-items: center; color: var(--muted); font-weight: 700; overflow: hidden; position: relative; }
.drawer-close { align-self: flex-end; width: 40px; min-height: 40px; padding: 0; }
.drawer-heading { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
.drawer-heading h2 { margin: 0; font-size: 24px; }
.drawer-heading strong { color: var(--accent-2); white-space: nowrap; font-size: 20px; }
.image-credit { font-size: 12px; color: var(--muted); text-decoration: none; }
.review-box { display: grid; gap: 10px; padding-top: 14px; border-top: 1px solid var(--line); }

.chat { height: calc(100vh - 72px); max-width: none; display: grid; grid-template-rows: auto 1fr auto; }
.chat-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.chat-head h2 { margin: 0; }
.messages { overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 16px; background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px solid var(--line); }
.messages p { 
  max-width: min(75%, 620px); 
  background: rgba(255, 255, 255, 0.05); 
  border: 1px solid var(--line); 
  padding: 10px 14px; 
  border-radius: 12px; 
  margin: 0; 
  display: grid; 
  gap: 4px; 
  color: var(--ink);
  font-size: 14px;
}
.messages small { color: var(--muted); font-size: 11px; font-weight: 500; }
.messages .mine { 
  align-self: flex-end; 
  background: rgba(0, 245, 160, 0.12); 
  border-color: rgba(0, 245, 160, 0.25);
  box-shadow: 0 4px 10px rgba(0, 245, 160, 0.04);
}
.send { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 14px; }
.send button {
  background: var(--accent-gradient);
  color: #080c14;
  border: none;
}
.send button:hover {
  box-shadow: 0 0 15px rgba(0, 245, 160, 0.3);
}

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stats div { 
  background: rgba(15, 23, 42, 0.45); 
  border: 1px solid var(--line); 
  border-radius: 12px; 
  padding: 18px; 
  display: grid; 
  gap: 5px; 
  box-shadow: 0 10px 24px rgba(0,0,0,0.15); 
}
.stats strong { font-size: 30px; color: var(--accent); }
.stats span { color: var(--muted); }
.queue { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.queue-card { max-width: none; display: grid; gap: 10px; }
.queue-card.risk { border-color: rgba(251, 191, 36, 0.45); background: rgba(251, 191, 36, 0.04); }
.queue-card.risk:hover { border-color: var(--gold); }
.users, .seller-table { display: grid; gap: 8px; }
.user-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(180px, 1.4fr) 112px auto;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.compact {
  max-width: none;
  display: grid;
  grid-template-columns: 82px minmax(180px, 1.3fr) 120px 130px auto auto;
  gap: 10px;
  align-items: center;
}
.compact img { width: 82px; height: 64px; border-radius: 8px; border: 1px solid var(--line); }

.state-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  margin: 16px 0;
}
.state-block h2 { margin: 0 0 4px; }
.skeleton { background: rgba(15, 23, 42, 0.3); }
.skeleton > div { background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
.skeleton section { display: grid; gap: 12px; padding: 14px; }
.skeleton span { height: 18px; border-radius: 8px; background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
.skeleton span:nth-child(2) { width: 72%; }
.skeleton span:nth-child(3) { width: 48%; }
@keyframes shimmer { to { background-position: -200% 0; } }

.mobile-nav { display: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}

@media (max-width: 1120px) {
  .filter-rail { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .rail-title { grid-column: 1 / -1; }
  .featured-row { grid-template-columns: 1fr; }
  .featured-card { min-height: 170px; }
  .sell-layout { grid-template-columns: 1fr; }
  .publish-card { position: static; }
}

@media (max-width: 980px) {
  .shell { grid-template-columns: 1fr; padding-bottom: 74px; }
  .sidebar { display: none; }
  .workspace { padding: 16px; }
  .market-hero { grid-template-columns: 1fr; }
  .hero-copy-block { min-height: 0; padding-top: 8px; }
  .trust-scene { min-height: 260px; }
  .mobile-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: #0f172a;
    border-top: 1px solid var(--line);
    padding: 6px;
    gap: 5px;
    backdrop-filter: var(--glass-blur);
  }
  .mobile-nav button { min-height: 52px; padding: 6px; background: transparent; color: var(--muted); flex-direction: column; gap: 2px; font-size: 12px; box-shadow: none; border: none; }
  .mobile-nav button.active { background: rgba(0, 245, 160, 0.12); color: var(--accent); }
}

@media (max-width: 720px) {
  h1 { font-size: 30px; }
  .searchbar, .split, .send, .user-row, .compact { grid-template-columns: 1fr; }
  .filter-rail { grid-template-columns: 1fr; position: static; }
  .grid { grid-template-columns: 1fr; }
  .listing { min-height: auto; }
  .actions button { flex: 1 1 120px; }
  .drawer { width: 100vw; }
  .drawer-heading { display: grid; }
  .drawer-heading strong { white-space: normal; }
  .state-block { display: grid; justify-items: start; }
  .topbar { display: grid; }
  .stepper { width: 100%; }
  .stepper button { flex: 1 1 110px; }
  .compact img { width: 100%; height: 150px; }
}
```

- [ ] **Step 2: Save the file**
Expected result: `styles.css` is completely overwritten with the dark theme styling.

---

### Task 2: WebGL & 2D Canvas Fallback Colors Update

**Files:**
- Modify: `/root/hyperlocal-marketplace/client/src/App.jsx`

- [ ] **Step 1: Update WebGL line and mesh colors in App.jsx**
Find the `TrustMapScene` component inside `/root/hyperlocal-marketplace/client/src/App.jsx`. Edit the grid lines, concentric rings, safe/review/danger materials, and 2D canvas fallback draw routines.

Make a contiguous replace on `/root/hyperlocal-marketplace/client/src/App.jsx:269-371`:

```javascript
    function drawCanvasFallback() {
      const canvas = document.createElement("canvas");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#080c14");
        gradient.addColorStop(1, "#0d1527");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(0, 245, 160, .12)";
        for (let x = 28; x < width; x += 38) {
          ctx.beginPath();
          ctx.moveTo(x, 18);
          ctx.lineTo(x - 54, height - 20);
          ctx.stroke();
        }
        for (let y = 36; y < height; y += 34) {
          ctx.beginPath();
          ctx.moveTo(18, y);
          ctx.lineTo(width - 20, y + 18);
          ctx.stroke();
        }
        listings.slice(0, 80).forEach((listing, index) => {
          const angle = index * 0.83;
          const radius = 46 + (index % 10) * 11;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius * 0.54;
          const high = (listing.fraud?.score ?? 0) >= 60;
          ctx.beginPath();
          ctx.strokeStyle = high ? "rgba(251, 191, 36, .38)" : "rgba(0, 245, 160, .26)";
          ctx.arc(x, y, high ? 12 : 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = high ? "#fbbf24" : "#00f5a0";
          ctx.arc(x, y, high ? 4.4 : 3.4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      current.appendChild(canvas);
      return () => current.replaceChildren();
    }

    const testCanvas = document.createElement("canvas");
    const hasWebGL = Boolean(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"));
    if (!hasWebGL) return drawCanvasFallback();

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      return drawCanvasFallback();
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    current.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.x = -0.92;
    scene.add(root);

    const grid = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0.15 });
    for (let i = -9; i <= 9; i += 1) {
      const horizontal = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.4, i * 0.32, 0), new THREE.Vector3(3.4, i * 0.32, 0)]);
      const vertical = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 0.38, -2.8, 0), new THREE.Vector3(i * 0.38, 2.8, 0)]);
      grid.add(new THREE.Line(horizontal, lineMaterial), new THREE.Line(vertical, lineMaterial));
    }
    root.add(grid);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    [1.1, 1.75, 2.4].forEach((radius) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.012, 96), ringMaterial);
      root.add(ring);
    });

    const safeMaterial = new THREE.MeshBasicMaterial({ color: 0x00f5a0 });
    const reviewMaterial = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const alertMaterial = new THREE.MeshBasicMaterial({ color: 0xf87171 });
    const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const pinGeometry = new THREE.SphereGeometry(0.045, 18, 18);
    const pulseGeometry = new THREE.RingGeometry(0.09, 0.105, 28);

    listings.slice(0, 90).forEach((listing, index) => {
      const score = listing.fraud?.score ?? 0;
      const angle = index * 0.77;
      const radius = 0.56 + (index % 13) * 0.16;
      const pin = new THREE.Group();
      const material = score >= 75 ? alertMaterial : score >= 45 ? reviewMaterial : safeMaterial;
      const dot = new THREE.Mesh(pinGeometry, material);
      const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial.clone());
      pulse.material.color.set(score >= 60 ? 0xfbbf24 : 0x00f5a0);
```

- [ ] **Step 2: Save the file**
Expected result: `App.jsx` compiles successfully.

---

### Task 3: Build & Visual Verification

**Files:**
- Test: `/root/hyperlocal-marketplace/client/package.json`

- [ ] **Step 1: Run production build compiler check**

Run: `npm run build -w client`
Expected: Output matches "vite v7.1.10 building for production... ✓ 324 modules transformed... client/dist/index.html ... client/dist/assets/index-..." and completes successfully without any compilation errors.
