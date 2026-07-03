# NeighborTrust UI/UX Complete Overhaul Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely rebuild the NeighborTrust frontend UI/UX from a cluttered sidebar+hero+drawer layout into a clean, dark premium marketplace inspired by Linear/Vercel/Discord — with top navbar, compact horizontal listing cards, Airbnb-style pill filters, full-page detail views, and subtle Framer Motion transitions.

**Architecture:**
- Remove Three.js dependency and the 3D trust radar entirely.
- Replace sidebar navigation with a top navbar.
- Replace the drawer-based detail view with a full-page SPA detail view using internal routing state.
- Restructure `App.jsx` into cleaner component blocks with a new page-routing model.
- Completely rewrite `styles.css` from scratch with proper dark premium tokens.

**Tech Stack:** React 19, Framer Motion, Lucide React, Vanilla CSS (Outfit font). Three.js REMOVED.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/styles.css` | **Rewrite** | Complete dark premium design system |
| `client/src/App.jsx` | **Rewrite** | New layout, routing, components, no Three.js |
| `client/src/api.js` | **Keep** | No changes needed |
| `client/src/visualManifest.js` | **Keep** | Still used for category images |
| `client/package.json` | **Modify** | Remove `three` dependency |
| `client/index.html` | **Keep** | No changes needed |

---

### Task 1: Remove Three.js Dependency

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Remove three from package.json**

In `client/package.json`, remove the line `"three": "^0.185.1"` from the `dependencies` object.

- [ ] **Step 2: Run npm install to update lockfile**

```bash
cd /root/hyperlocal-marketplace && npm install -w client
```

Expected: `three` is no longer in `node_modules` for the client workspace. No errors.

---

### Task 2: Rewrite styles.css — Dark Premium Design System

**Files:**
- Rewrite: `client/src/styles.css`

- [ ] **Step 1: Write the complete new design system**

Overwrite `client/src/styles.css` entirely. Design principles:

**Color Tokens:**
- `--bg-primary: #0a0a0b` — Near-black background (like Linear)
- `--bg-secondary: #141416` — Elevated surface (cards, navbar)
- `--bg-tertiary: #1c1c1f` — Hover/active states
- `--bg-elevated: #222225` — Modals, popovers
- `--border: rgba(255, 255, 255, 0.06)` — Subtle borders
- `--border-hover: rgba(255, 255, 255, 0.12)` — Hover borders
- `--text-primary: #ececed` — Primary text
- `--text-secondary: #8b8b8e` — Muted text
- `--text-tertiary: #5c5c5f` — Disabled/hint text
- `--accent: #6e56cf` — Primary accent (muted violet, like Linear)
- `--accent-hover: #7c66d4` — Accent hover
- `--accent-subtle: rgba(110, 86, 207, 0.12)` — Accent backgrounds
- `--success: #30a46c` — Green for safe/verified
- `--warning: #e5a537` — Amber for review
- `--danger: #e5484d` — Red for high risk
- `--blue: #3b82f6` — Price highlights

**Layout Structure:**
```
┌─────────────────────────────────────────┐
│  TOP NAVBAR (fixed, 56px height)        │
│  Logo | Browse | Sell | Manage | Admin  │
│                           User | Login  │
├─────────────────────────────────────────┤
│  CONTENT AREA (below navbar, centered)  │
│                                         │
│  [Stats Bar - optional compact row]     │
│  [Pill Filters Row]                     │
│  [Search Bar]                           │
│  [Listing Grid - horizontal cards]      │
│                                         │
│  OR                                     │
│                                         │
│  [Full Page Detail View]                │
│  [Sell Form]                            │
│  [Chat View]                            │
│  [Admin Dashboard]                      │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  MOBILE BOTTOM NAV (fixed, 56px)        │
└─────────────────────────────────────────┘
```

**Components to style:**

1. **`.topnav`** — Fixed top bar, 56px, `--bg-secondary`, subtle bottom border, blur backdrop. Flex layout: logo left, nav center, user right.

2. **`.topnav-item`** — Text-only nav buttons, 13px, `--text-secondary` default, `--text-primary` on hover, `--accent` when active with 2px bottom indicator.

3. **`.content`** — Main wrapper, `max-width: 1200px`, centered, `padding: 80px 24px 24px`.

4. **`.stats-bar`** — Compact flex row of stat chips. One slim row, not a hero.

5. **`.filter-chips`** — Horizontal scrollable flex row. Each pill: rounded-full, `--bg-secondary`, 13px, `--text-secondary`. Active: `--accent-subtle` bg, `--accent` text.

6. **`.search-row`** — Single search input with icon, max-width 480px.

7. **`.listing-card`** — Horizontal: `grid-template-columns: 180px 1fr`. Image left, details right. `--bg-secondary` background, `--border`. Hover: `--border-hover` + translateY(-1px).

8. **`.trust-badge`** — Compact pill: icon + score. Green/amber/red based on score thresholds.

9. **`.detail-page`** — Full page. Large image top, two-column below (details left, seller right).

10. **`.sell-form`** — Centered column, max-width 640px. Clean step progress bar.

11. **`.chat-page`** — Full height. Clean bubbles: sent = accent-subtle, received = bg-tertiary.

12. **`.admin-page`** — Stats grid + tabbed sections with underline tabs.

13. **`.mobile-nav`** — Fixed bottom, 56px, `--bg-secondary`, 5 icon buttons.

14. **Skeleton loaders** — Shimmer with `--bg-tertiary` pulse.

15. **All transitions** — `transition: all 0.15s ease`. Clean and fast.

Full CSS should be ~400-500 lines covering every component plus responsive breakpoints at 1024px, 768px, and 480px.

---

### Task 3: Rewrite App.jsx — New Layout & Component Architecture

**Files:**
- Rewrite: `client/src/App.jsx`

- [ ] **Step 1: Write the complete new App.jsx**

**Key structural changes:**

1. **Remove all Three.js imports and the `TrustMapScene` component entirely.**

2. **Replace `mode` state with richer page model:**
   ```javascript
   const [page, setPage] = useState({ view: "browse", listingId: null });
   ```
   Views: `"browse"`, `"detail"`, `"create"`, `"seller"`, `"chat"`, `"admin"`

3. **New top-level layout:**
   ```jsx
   <main>
     <TopNav ... />
     <div className="content">
       <AnimatePresence mode="wait">
         {page.view === "browse" && <BrowsePage ... />}
         {page.view === "detail" && <DetailPage ... />}
         {page.view === "create" && <CreatePage ... />}
         {page.view === "seller" && <SellerPage ... />}
         {page.view === "chat" && <ChatPage ... />}
         {page.view === "admin" && <AdminPage ... />}
       </AnimatePresence>
     </div>
     <MobileNav ... />
   </main>
   ```

4. **`TopNav` component:**
   - Fixed top bar, blur backdrop
   - Left: Logo (ShieldCheck + "NeighborTrust")
   - Center: Nav items as text buttons with active indicators
   - Right: User info + Login/Logout

5. **`BrowsePage` (replaces Browse):**
   - Compact stats bar (slim row, not hero)
   - `FilterChips` row (Airbnb pills for categories)
   - Search input
   - Grid of horizontal `ListingCard` components
   - No featured section, no drawer
   - Click card → `setPage({ view: "detail", listingId })`

6. **`ListingCard` (replaces ListingItem + FeaturedListing):**
   - Horizontal: 180px image left, details right
   - Title, price (blue), 1-line description, meta pills, trust badge
   - No risk meter bar — just compact trust badge pill
   - Hover: subtle border + translateY(-1px)

7. **`TrustBadge` (replaces RiskMeter on cards):**
   - Compact pill: score number + icon
   - Color: green (<45), amber (45-74), red (75+)

8. **`FilterChips` (new, replaces filter-rail dropdowns):**
   - Horizontal row of pill buttons
   - "All" + one per category
   - Active pills highlighted with accent
   - Additional pills for condition and status

9. **`DetailPage` (replaces DetailDrawer):**
   - Full page, not a drawer
   - "← Back to listings" button at top
   - Large product image (max-height 400px, rounded)
   - Two-column below: details left, seller card + actions right
   - Clean risk meter (only on detail page)
   - Review form if applicable

10. **`CreatePage` (replaces CreateListing):**
    - Centered single-column (max-width 640px)
    - Horizontal progress dots (not button tabs)
    - Same upload/details/publish flow, cleaner styling
    - Live preview on right (desktop)

11. **`SellerPage` (replaces SellerListings):**
    - Clean list with inline edit controls
    - Same functionality, cleaner look

12. **`ChatPage` (replaces Chat):**
    - Full height layout
    - Clean bubbles: sent = accent-subtle, received = bg-tertiary
    - Clean input bar bottom

13. **`AdminPage` (replaces Admin):**
    - Stats grid top
    - Underline tab navigation (Reports | Fraud Queue | Users)
    - Same API calls, cleaner layout

14. **Page transitions:**
    - `AnimatePresence mode="wait"`
    - Enter: `opacity: 0, y: 8` → `opacity: 1, y: 0`, 0.2s ease-out
    - Exit: `opacity: 0`, 0.12s ease-in
    - No spring physics

15. **Card hover animations:**
    - `whileHover={{ y: -2 }}` with `transition={{ duration: 0.15 }}`

---

### Task 4: Build Verification

- [ ] **Step 1: Run production build**

```bash
cd /root/hyperlocal-marketplace && npm run build -w client
```

Expected: Build succeeds. `three` no longer in bundle. JS size should drop significantly.

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev -w client
```

Expected: Vite starts on localhost:5173 without errors.

---

## Design Verification Checklist

After implementation, verify:

- [ ] Navbar is fixed, blur backdrop, doesn't scroll
- [ ] Content is centered with max-width 1200px
- [ ] Cards are horizontal (image left, details right)
- [ ] Filter chips look like Airbnb pills (rounded-full)
- [ ] Clicking a listing opens full detail page (not drawer)
- [ ] Back button returns to browse with filters preserved
- [ ] Page transitions are smooth fade-ins
- [ ] Mobile bottom nav shows below 768px, top nav hides
- [ ] Three.js is gone — no WebGL/canvas
- [ ] Trust badges are small colored pills
- [ ] Overall: clean, spacious, dark, premium — Linear/Vercel feel
