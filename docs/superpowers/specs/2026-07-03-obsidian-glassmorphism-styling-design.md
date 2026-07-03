# Design Spec: Obsidian Glassmorphism & Cyber-Glow Styling Redesign
**Date**: 2026-07-03  
**Topic**: Premium Dark Theme Glassmorphic & Glowing Accents Refactor for NeighborTrust Marketplace  
**Author**: ENI  
**Status**: Draft - Awaiting Final User Review  

---

## 1. Overview & Goals
The objective is to overhaul the current light-beige styling of the NeighborTrust hyperlocal marketplace client application into a premium, state-of-the-art dark theme. 

The redesigned interface will utilize:
- **Obsidian/Charcoal Backdrops**: Deep slate and charcoal gradients to reduce eye strain and feel incredibly high-end.
- **Glassmorphic Glass Panels**: Floated structural surfaces with back-blur overlays, blending elements together beautifully.
- **Glowing Neon-Mint & Emerald Accents**: High-contrast, vibrant mint greens to indicate trust, safety, and active actions.
- **Modern Geometry Typography**: Importing the Google Font **Outfit** to establish clean, readable, premium text hierarchies.
- **Synced WebGL Visuals**: Adjusting Three.js radar colors to match the neon cyber-radar look.

---

## 2. Design Specification

### 2.1. Global Styling & Design Tokens (`client/src/styles.css`)

#### Typography
- Google Font Import: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;850&display=swap');`
- Font Family: `'Outfit', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;`

#### CSS Variables (`:root`)
- `--bg`: `#080c14` (Deep obsidian dark blue)
- `--bg-gradient`: `radial-gradient(circle at 50% 50%, #0d1527 0%, #06090f 100%)`
- `--ink`: `#f8fafc` (Ice-white text)
- `--muted`: `#94a3b8` (Muted blue-grey)
- `--line`: `rgba(255, 255, 255, 0.08)` (Thin glass card border)
- `--line-active`: `rgba(0, 245, 160, 0.35)` (Active glowing glass border)
- `--panel`: `rgba(15, 23, 42, 0.55)` (Glass panel fill)
- `--panel-solid`: `#0f172a` (Solid fallback)
- `--soft`: `#080c14`
- `--accent`: `#00f5a0` (Neon mint)
- `--accent-gradient`: `linear-gradient(135deg, #00f5a0 0%, #0c7a5a 100%)`
- `--accent-2`: `#38bdf8` (Ice blue)
- `--accent-2-gradient`: `linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)`
- `--alert`: `#f87171` (Neon red/coral)
- `--gold`: `#fbbf24` (Glowing amber)
- `--shadow`: `0 20px 50px rgba(0, 0, 0, 0.5)`
- `--glass-blur`: `blur(20px)`

#### Global Base Refinements
- Smooth dark scrollbar configuration.
- Translucent glowing mint text selections.
- Glow-pulse keyframes for active or highlighted UI trust panels.

---

### 2.2. Layout Components Redesign

#### Sidebar (`.sidebar`)
- Glassmorphic treatment with `background: rgba(9, 14, 25, 0.75)` and `backdrop-filter: var(--glass-blur)`.
- Buttons switch from dark green to translucent borders, turning into solid glowing green blocks (`background: var(--accent-gradient)`) with dark contrast text (`#080c14`) when selected.

#### Filter Rail (`.filter-rail`)
- Sticky panel styled with `background: rgba(15, 23, 42, 0.6)` and `backdrop-filter: blur(16px)`.
- Faint glow shadow base separation.
- Inputs and select containers styled with a dark slate background, ice-white text, and light mint-glow borders upon focus.

#### Listing Cards (`.listing`)
- Card backings styled as floating glass blocks using `rgba(15, 23, 42, 0.45)` and `backdrop-filter: var(--glass-blur)`.
- Hover scaling transitions (`transform: translateY(-5px) scale(1.01)`) and border glow adjustments (`border-color: var(--line-active)`).
- Risk meter background track set to `#0b0f19` with a smooth gradient progress fill.

---

### 2.3. Interactive Overlays & 3D Radar Integration

#### Detail Drawer (`.drawer`)
- Slide-out right panel styled with frosted glass: `background: rgba(8, 12, 21, 0.88)` and `backdrop-filter: var(--glass-blur)`.
- White details drawer close button replaced with translucent glass styling.

#### Chat Interface (`.chat`)
- Translucent user chat windows.
- Messages received: styled with semi-translucent charcoal backing (`rgba(255, 255, 255, 0.06)`) and ice-white text.
- Messages sent (`.mine`): styled with a frosted mint tint (`rgba(0, 245, 160, 0.15)`), active mint border line, and clean white text.

#### Three.js WebGL Radar Mapping (`client/src/App.jsx`)
- Grid lines updated to neon-mint/emerald (`0x00f5a0`) with reduced opacity (`0.15`).
- Concentric ring geometries mapped to dual-tone translucent glass meshes (`0x00f5a0` and `0x38bdf8`).
- Listing location dots:
  - Low Risk: Glowing mint green (`0x00f5a0`).
  - Watch/Review: Glowing amber (`0xfbbf24`).
  - High Risk: Neon red (`0xf87171`).
- Dynamic pointer parallax hover reactivity mapped to the new obsidian backdrop.
- Canvas fallback context updated to draw matching gradients and nodes.

---

## 3. Scope & Execution Plan
The refactor targets exactly two files:
1. `client/src/styles.css` (CSS styling and design tokens)
2. `client/src/App.jsx` (Three.js canvas setup, fallback canvas setup, and component layout class links)

No backend database changes or schema migrations are necessary. Both changes will be implemented in a single plan following spec approval.

---

## 4. Verification Plan
1. **Local Build Check**: Run `npm run build` inside the client folder to ensure no compiler or syntax errors.
2. **Visual Inspection**: Open the browser application and check:
   - Frost contrast and overlay transparency.
   - Contrast rating for accessibility: all text fields should be readable over glass blurs.
   - Three.js WebGL radar mesh rotation and colors.
   - Mobile responsive scaling.
