import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, ChevronDown,
  Clock3, Edit3, Eye, EyeOff, Flag, Heart, Home, ImagePlus, Loader2, LogIn, LogOut,
  MapPin, MessageCircle, PackageCheck, Plus, Search, Send, ShieldAlert,
  ShieldCheck, Star, Trash2, Upload, UserCog, X
} from "lucide-react";
import { API_URL, api, uploadFile } from "./api.js";
import { getCategoryVisual, getListingVisual } from "./visualManifest.js";
import "./styles.css";

const defaultLocation = { lat: 23.7465, lng: 90.376 };
const categories = ["phone","laptop","camera","furniture","bicycle","appliance","fashion","books","gaming","accessories"];
const conditions = ["new","excellent","good","fair","poor"];
const statuses = ["available","reserved","sold"];

let toastId = 0;

/* ════════════════════════════ MAIN APP ════════════════════════════ */
function App() {
  const [token, setToken] = useState(localStorage.getItem("token") ?? "");
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [page, setPage] = useState({ view: "browse", listingId: null });
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ q: "", category: "", condition: "", status: "", sort: "newest", radiusKm: 8, lat: defaultLocation.lat, lng: defaultLocation.lng });
  const [selectedListingData, setSelectedListingData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [admin, setAdmin] = useState({ stats: null, queue: [], users: [], reports: [] });
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const socket = useMemo(() => io(API_URL || undefined, { autoConnect: true }), []);
  const role = user?.role ?? "guest";
  const prevPage = useRef(page.view);

  const pushToast = useCallback((message, type = "info") => {
    const id = ++toastId;
    setToasts(t => [{ id, message, type }]);
    const ms = type === "error" ? 6000 : 4000;
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  // Clear toasts on route change
  useEffect(() => {
    if (prevPage.current !== page.view) {
      setToasts([]);
      prevPage.current = page.view;
    }
  }, [page.view]);

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", {}, token)
      .then(res => setUser(res.user?.id ? res.user : null))
      .catch(() => { localStorage.removeItem("token"); setToken(""); });
  }, [token]);

  useEffect(() => {
    if (page.view === "browse") loadListings();
  }, [filters.category, filters.condition, filters.status, filters.sort, filters.radiusKm, page.view]);

  useEffect(() => {
    if (page.view === "detail" && page.listingId) {
      const found = listings.find(l => l.id === page.listingId);
      if (found) { setSelectedListingData(found); }
      else {
        api(`/api/listings/${page.listingId}`, {}, token)
          .then(data => setSelectedListingData(data))
          .catch(err => pushToast(err.message, "error"));
      }
    }
  }, [page.view, page.listingId, listings, token]);

  useEffect(() => {
    socket.on("chat:message", msg => {
      if (msg.listingId === page.listingId) setMessages(m => [...m, msg]);
    });
    return () => socket.off("chat:message");
  }, [socket, page.listingId]);

  async function loadListings(extra = {}) {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v !== "" && v != null) params.set(k, v); });
    setLoading(true); setError("");
    try { const data = await api(`/api/listings?${params}`, {}, token); setListings(data.items ?? []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function login(email, password) {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    localStorage.setItem("token", data.token); setToken(data.token); setUser(data.user);
    pushToast(`Signed in as ${data.user.name}`, "success"); setAuthModal(null);
  }

  async function register(name, email, password) {
    const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, location: defaultLocation }) });
    localStorage.setItem("token", data.token); setToken(data.token); setUser(data.user);
    pushToast("Account created", "success"); setAuthModal(null);
  }

  async function loadAdmin() {
    try {
      const [stats, queue, users, reports] = await Promise.all([
        api("/api/admin/analytics", {}, token), api("/api/admin/fraud-queue", {}, token),
        api("/api/admin/users", {}, token), api("/api/admin/reports", {}, token)
      ]);
      setAdmin({ stats, queue: queue.items, users: users.items, reports: reports.items });
      setPage({ view: "admin", listingId: null });
    } catch (err) { pushToast(err.message, "error"); }
  }

  async function openChat(listing) {
    if (!user) return pushToast("Sign in to message sellers", "warning");
    socket.emit("listing:join", listing.id);
    try {
      const data = await api(`/api/chat/${listing.id}`, {}, token);
      setMessages(data.items); setSelectedListingData(listing);
      setPage({ view: "chat", listingId: listing.id });
    } catch (err) { pushToast(err.message, "error"); }
  }

  function logout() {
    localStorage.removeItem("token"); setToken(""); setUser(null);
    setPage({ view: "browse", listingId: null });
    pushToast("Signed out", "info");
  }

  const nav = [
    { id: "browse", label: "Browse", Icon: Search, disabled: false },
    { id: "create", label: "Sell", Icon: Plus, disabled: !user },
    { id: "seller", label: "Manage", Icon: PackageCheck, disabled: !user },
    { id: "chat", label: "Chat", Icon: MessageCircle, disabled: !page.listingId || !user },
    { id: "admin", label: "Admin", Icon: UserCog, disabled: role !== "admin" }
  ];

  function handleNav(id, disabled) {
    if (disabled) {
      if (!user) return setAuthModal("login");
      if (id === "chat") return pushToast("Open a listing to start a chat", "info");
      if (id === "admin") return pushToast("This page requires admin access", "error");
    }
    id === "admin" ? loadAdmin() : setPage({ view: id, listingId: id === "chat" ? page.listingId : null });
  }

  return (
    <main>
      <header className="topnav">
        <div className="topnav-brand" onClick={() => setPage({ view: "browse", listingId: null })}>
          <svg viewBox="0 0 32 32" fill="none" style={{ width: 22, height: 22, color: 'var(--accent-solid)' }}>
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.8" />
            <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" strokeOpacity="0.4" />
            <path d="M12 12C12 10.5 16 9 16 9C16 9 20 10.5 20 12C20 16 16 19 16 19C16 19 12 16 12 12Z" fill="currentColor" />
          </svg>
          <span>Radius</span>
        </div>
        <div className="topnav-center">
          {nav.map(({ id, label, disabled }) => (
            <button key={id} className={`topnav-item ${page.view === id ? "active" : ""}`}
              onClick={() => handleNav(id, disabled)} style={{ opacity: disabled ? 0.45 : 1 }}>{label}</button>
          ))}
        </div>
        <div className="topnav-right">
          {user ? (
            <>
              <span className="user-info">{user.name}</span>
              <button className="btn btn-secondary btn-sm" onClick={logout}><LogOut size={14} /> Sign Out</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setAuthModal("login")}><LogIn size={14} /> Login</button>
              <button className="btn btn-primary btn-sm" onClick={() => setAuthModal("register")}>Register</button>
            </>
          )}
        </div>
      </header>

      <div className="content">
        <ToastContainer toasts={toasts} dismiss={dismissToast} />
        <AnimatePresence>{authModal && <AuthModal key="auth" mode={authModal} setMode={setAuthModal} onClose={() => setAuthModal(null)} onLogin={login} onRegister={register} />}</AnimatePresence>
        <AnimatePresence mode="wait">
          {page.view === "browse" && <PT key="browse"><BrowsePage listings={listings} filters={filters} setFilters={setFilters} loadListings={loadListings} setPage={setPage} loading={loading} error={error} /></PT>}
          {page.view === "detail" && selectedListingData && <PT key="detail"><DetailPage listing={selectedListingData} allListings={listings} setPage={setPage} openChat={openChat} token={token} user={user} pushToast={pushToast} /></PT>}
          {page.view === "create" && <PT key="create"><CreatePage token={token} onCreated={() => { setPage({ view: "browse", listingId: null }); loadListings(); }} pushToast={pushToast} /></PT>}
          {page.view === "seller" && <PT key="seller"><SellerPage listings={listings.filter(i => i.sellerId === user?.id)} token={token} reload={loadListings} pushToast={pushToast} setPage={setPage} /></PT>}
          {page.view === "chat" && selectedListingData && <PT key="chat"><ChatPage listing={selectedListingData} user={user} token={token} messages={messages} setMessages={setMessages} pushToast={pushToast} /></PT>}
          {page.view === "admin" && <PT key="admin"><AdminPage admin={admin} token={token} reload={loadAdmin} pushToast={pushToast} /></PT>}
        </AnimatePresence>
      </div>

      <nav className="mobile-nav">
        {nav.map(({ id, label, Icon, disabled }) => (
          <button key={id} className={`mobile-nav-item ${page.view === id ? "active" : ""}`}
            onClick={() => handleNav(id, disabled)} style={{ opacity: disabled ? 0.45 : 1 }}>
            <Icon size={20} /><span className="mobile-nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

/* ════════════════════════════ SHARED COMPONENTS ════════════════════════════ */

function PT({ children }) {
  return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: "easeOut" }}>{children}</motion.div>;
}

function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.slice(0, 1).map(t => (
          <motion.div key={t.id} className={`toast toast-${t.type}`}
            initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {t.type === "success" && <CheckCircle2 size={16} />}
            {t.type === "error" && <ShieldAlert size={16} />}
            {t.type === "warning" && <AlertTriangle size={16} />}
            {t.type === "info" && <Eye size={16} />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)}><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function TrustBadge({ score, flags, status }) {
  const [expanded, setExpanded] = useState(false);
  const isVerified = score < 45 && status !== "review";
  const isFlagged = score >= 75 || status === "review";
  const isReview = !isVerified && !isFlagged;

  let cls = "verified", label = "Verified", Icon = ShieldCheck;
  if (isFlagged) { cls = "danger"; label = "Flagged"; Icon = ShieldAlert; }
  else if (isReview) { cls = "flagged"; label = "Under Review"; Icon = AlertTriangle; }

  return (
    <div>
      <div className={`trust-badge ${cls}`} onClick={() => setExpanded(!expanded)} role="button" tabIndex={0} aria-expanded={expanded}>
        <Icon className="icon" /><span>{label}</span>
        {flags?.length > 0 && <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
      </div>
      {expanded && flags?.length > 0 && (
        <div className="trust-expand">
          {flags.map((f, i) => <div key={i} className="trust-expand-item"><AlertTriangle className="icon" style={{ color: 'var(--warning)' }} /><span>{f}</span></div>)}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-img skeleton" />
      <div className="skeleton-card-body">
        <div className="skeleton-line h-lg w-60 skeleton" />
        <div className="skeleton-line w-40 skeleton" />
        <div className="skeleton-line w-80 skeleton" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={28} /></div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-text">{text}</div>
      {action && <button className="btn btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

function FileDropzone({ files, setFiles, max = 5 }) {
  const inputRef = useRef(null);
  function handleChange(e) {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected].slice(0, max));
    e.target.value = "";
  }
  function removeFile(index) { setFiles(prev => prev.filter((_, i) => i !== index)); }
  return (
    <div>
      <div className="dropzone" onClick={() => inputRef.current?.click()}>
        <Upload size={28} className="dropzone-icon" />
        <div className="dropzone-text">Tap to add photos</div>
        <div className="dropzone-sub">Up to {max} images · JPG or PNG</div>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} />
      </div>
      {files.length > 0 && (
        <div className="photo-preview-grid">
          {files.map((f, i) => (
            <div key={i} className="photo-preview">
              <img src={URL.createObjectURL(f)} alt="" />
              <button className="photo-preview-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RadarBlip() {
  return (
    <span className="radar-blip">
      <span className="radar-blip-ring" />
      <span className="radar-blip-ring" />
      <span className="radar-blip-dot" />
    </span>
  );
}

function RadarSweep({ text }) {
  return (
    <div>
      <div className="radar-sweep-container">
        <div className="radar-sweep-ring" />
        <div className="radar-sweep-ring" />
        <div className="radar-sweep-ring" />
        <div className="radar-sweep-arm" />
      </div>
      <div className="radar-sweep-text">{text || "Scanning listing for fraud signals…"}</div>
    </div>
  );
}

/* ════════════════════════════ AUTH MODAL ════════════════════════════ */

function AuthModal({ mode, setMode, onClose, onLogin, onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try { isLogin ? await onLogin(email, password) : await onRegister(name, email, password); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div className="modal-content" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isLogin ? "Welcome back" : "Create an account"}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        {err && <div className="toast toast-error mb-3" style={{ position: 'static' }}><ShieldAlert size={14} /><span>{err}</span></div>}
        <form onSubmit={handleSubmit} className="modal-body">
          {!isLogin && <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" /></div>}
          <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" /></div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input password-input"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
            {busy ? <Loader2 size={16} className="icon-spin" /> : isLogin ? "Sign In" : "Register"}
          </button>
        </form>
        <div className="modal-footer">
          {isLogin
            ? <span>Don't have an account? <button className="text-link" onClick={() => setMode("register")}>Register</button></span>
            : <span>Already have an account? <button className="text-link" onClick={() => setMode("login")}>Sign In</button></span>}
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════ BROWSE PAGE ════════════════════════════ */

function RadarHero({ listings }) {
  const reviewCount = listings.filter(l => l.fraud?.decision === "review").length;
  const dots = listings.slice(0, 12).map((l, i) => {
    const angle = (i / Math.min(listings.length, 12)) * Math.PI * 2;
    const band = l.distanceKm ?? (i % 3 + 1) * 2;
    const r = 18 + Math.min(band, 8) / 8 * 32;
    return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle), flagged: l.fraud?.decision === "review", id: l.id };
  });

  return (
    <div className="hero-section">
      <div className="radar-container">
        <div className="radar-ring radar-ring-3 pulse" />
        <div className="radar-ring radar-ring-2 pulse" />
        <div className="radar-ring radar-ring-1 pulse" />
        <div className="radar-center" />
        {dots.map(d => <div key={d.id} className={`radar-dot ${d.flagged ? "flagged" : "verified"}`} style={{ top: `${d.y}%`, left: `${d.x}%` }} />)}
        <span className="radar-label" style={{ top: '22%', left: '78%' }}>5 km</span>
        <span className="radar-label" style={{ top: '36%', left: '72%' }}>2 km</span>
        <span className="radar-label" style={{ top: '48%', left: '68%' }}>500m</span>
      </div>
      <div className="radar-caption">
        <span className="radar-caption-dot" style={{ background: 'var(--verified)' }} /> {listings.length} nearby
        <span style={{ color: 'var(--text-tertiary)' }}>·</span>
        <span className="radar-caption-dot" style={{ background: 'var(--warning)' }} /> {reviewCount} under AI review
      </div>
    </div>
  );
}

function BrowsePage({ listings, filters, setFilters, loadListings, setPage, loading, error }) {
  return (
    <div>
      <RadarHero listings={listings} />

      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4 }}>
        The Safe Way to <span className="text-glow">Trade Nearby</span>
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-6)', maxWidth: 520 }}>
        Dhaka's verified neighbour marketplace. Protected by real-time trust scoring and automated fraud screening.
      </p>

      <div className="hero-search">
        <span className="hero-search-icon"><Search size={18} /></span>
        <input placeholder="Search phones, laptops, cameras..." value={filters.q}
          onChange={e => setFilters({ ...filters, q: e.target.value })}
          onKeyDown={e => e.key === "Enter" && loadListings({ q: filters.q })} />
        <button className="hero-search-btn" onClick={() => loadListings({ q: filters.q })}>Search</button>
      </div>

      <div className="filter-bar">
        <div className="filter-row">
          <span className="filter-row-label">Category</span>
          <button className={`filter-pill ${filters.category === "" ? "active" : ""}`} onClick={() => setFilters({ ...filters, category: "" })}>All</button>
          {categories.map(c => <button key={c} className={`filter-pill ${filters.category === c ? "active" : ""}`} onClick={() => setFilters({ ...filters, category: c })}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}
        </div>
        <div className="filter-row">
          <span className="filter-row-label">Condition</span>
          <button className={`filter-pill ${filters.condition === "" ? "active" : ""}`} onClick={() => setFilters({ ...filters, condition: "" })}>Any</button>
          {conditions.map(c => <button key={c} className={`filter-pill ${filters.condition === c ? "active" : ""}`} onClick={() => setFilters({ ...filters, condition: c })}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}
          <select className="sort-select" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })} style={{ marginLeft: 'auto' }}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="nearest">Nearest</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="listing-grid">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <EmptyState icon={ShieldAlert} title="Something went wrong" text={error} action="Retry" onAction={() => loadListings()} />
      ) : listings.length === 0 ? (
        <EmptyState icon={Search} title="No listings found" text="Try different filters or search terms" action="Clear filters" onAction={() => setFilters({ ...filters, q: "", category: "", condition: "" })} />
      ) : (
        <div className="listing-grid">
          {getSortedListings(listings, filters.sort).map(listing => (
            <motion.div key={listing.id} className="listing-card" onClick={() => setPage({ view: "detail", listingId: listing.id })}
              whileHover={{ y: -2 }} transition={{ duration: 0.1 }}>
              <div className="card-image-wrap"><img src={getListingVisual(listing).src} alt={listing.title} className="card-image" /></div>
              <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 className="card-title">{listing.title}</h3>
                  <div className="card-price">৳{Number(listing.price).toLocaleString()}</div>
                </div>
                <p className="card-desc">{listing.description}</p>
                <div className="card-meta">
                  <span className="meta-pill">{listing.category}</span>
                  <span className="meta-pill">{listing.condition}</span>
                  {listing.distanceKm != null && <span className="card-distance"><RadarBlip />{listing.distanceKm < 1 ? `${Math.round(listing.distanceKm * 1000)}m` : `${listing.distanceKm.toFixed(1)}km`}</span>}
                  <TrustBadge score={listing.fraud?.score ?? 0} flags={[]} status={listing.status} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function getSortedListings(items, sort) {
  const arr = [...items];
  switch (sort) {
    case "price_asc": return arr.sort((a, b) => a.price - b.price);
    case "price_desc": return arr.sort((a, b) => b.price - a.price);
    case "nearest": return arr.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    default: return arr;
  }
}

/* ════════════════════════════ DETAIL PAGE ════════════════════════════ */

function DetailPage({ listing, allListings, setPage, openChat, token, user, pushToast }) {
  const [reportReason, setReportReason] = useState("");
  const [showReport, setShowReport] = useState(false);
  const score = listing.fraud?.score ?? 0;
  const flags = listing.fraud?.flags ?? listing.fraud?.signals ?? [];

  const similar = allListings
    .filter(l => l.id !== listing.id && l.category === listing.category)
    .slice(0, 4);
  const avgPrice = similar.length > 0 ? similar.reduce((s, l) => s + l.price, 0) / similar.length : null;
  const priceDiff = avgPrice ? Math.round(((listing.price - avgPrice) / avgPrice) * 100) : null;

  async function handleReport() {
    if (!reportReason || !user) return;
    try {
      await api(`/api/listings/${listing.id}/report`, { method: "POST", body: JSON.stringify({ reason: reportReason }) }, token);
      pushToast("Listing reported — admins will review it", "success");
      setReportReason(""); setShowReport(false);
    } catch (err) { pushToast(err.message, "error"); }
  }

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => setPage({ view: "browse", listingId: null })}><ArrowLeft size={16} />Back to listings</button>

      <div className="detail-gallery">
        <img src={getListingVisual(listing).src} alt={listing.title} />
      </div>

      <div className="detail-grid">
        <div>
          <h1 className="detail-title">{listing.title}</h1>
          <div className="detail-price">৳{Number(listing.price).toLocaleString()}</div>
          <div className="detail-meta-row">
            <span className="meta-pill">{listing.category}</span>
            <span className="meta-pill">{listing.condition}</span>
            <span className="meta-pill">{listing.brand || "Unbranded"}</span>
            {listing.distanceKm != null && <span className="card-distance"><RadarBlip />{listing.distanceKm < 1 ? `${Math.round(listing.distanceKm * 1000)}m` : `${listing.distanceKm.toFixed(1)}km`} away</span>}
          </div>

          {/* Trust Scan Card */}
          <div className="trust-scan-card">
            <div className="trust-scan-header">
              <span className="detail-section-title" style={{ margin: 0 }}>Trust Scan</span>
              <TrustBadge score={score} flags={flags} status={listing.status} />
            </div>
            <div className="trust-scan-bar-track">
              <div className="trust-scan-bar-fill" style={{ width: `${Math.max(score, 4)}%`, backgroundColor: score >= 75 ? 'var(--danger)' : score >= 45 ? 'var(--warning)' : 'var(--verified)' }} />
            </div>
            {flags.length > 0 ? (
              <div className="trust-scan-flags">
                {flags.map((f, i) => <div key={i} className="trust-scan-flag"><AlertTriangle className="icon" style={{ color: 'var(--warning)' }} /><span>{f}</span></div>)}
              </div>
            ) : (
              <div className="trust-scan-flag" style={{ color: 'var(--verified)' }}><ShieldCheck className="icon" /><span>No risk factors detected</span></div>
            )}
          </div>

          <h3 className="detail-section-title">Description</h3>
          <p className="detail-desc">{listing.description}</p>

          {/* Item Details Table */}
          <h3 className="detail-section-title">Item Details</h3>
          <div className="item-details-table">
            <div className="item-details-row"><span className="item-details-key">Category</span><span className="item-details-val">{listing.category}</span></div>
            <div className="item-details-row"><span className="item-details-key">Condition</span><span className="item-details-val">{listing.condition}</span></div>
            <div className="item-details-row"><span className="item-details-key">Brand</span><span className="item-details-val">{listing.brand || "—"}</span></div>
            <div className="item-details-row"><span className="item-details-key">Status</span><span className="item-details-val">{listing.status}</span></div>
            <div className="item-details-row"><span className="item-details-key">Listed</span><span className="item-details-val">{new Date(listing.createdAt).toLocaleDateString()}</span></div>
          </div>

          {/* Price Radar */}
          {similar.length > 0 && (
            <div className="price-radar-card">
              <h3 className="detail-section-title">Price Radar</h3>
              {priceDiff !== null && (
                <div className="price-radar-summary">
                  Priced <strong style={{ color: priceDiff <= 0 ? 'var(--verified)' : 'var(--warning)' }}>{Math.abs(priceDiff)}% {priceDiff <= 0 ? "below" : "above"}</strong> similar {listing.category} listings near you.
                </div>
              )}
              {similar.map(s => (
                <div key={s.id} className="price-radar-item" style={{ cursor: 'pointer' }} onClick={() => setPage({ view: "detail", listingId: s.id })}>
                  <span className="price-radar-title">{s.title}</span>
                  <span className="price-radar-price">৳{Number(s.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Report */}
          {user && listing.sellerId !== user.id && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              {!showReport ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)} style={{ color: 'var(--text-tertiary)' }}><Flag size={14} /> Report listing</button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" placeholder="Reason for report..." value={reportReason} onChange={e => setReportReason(e.target.value)} />
                  <button className="btn btn-danger btn-sm" onClick={handleReport}>Submit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          <div className="seller-card">
            <h3 className="detail-section-title">About the Seller</h3>
            <div className="seller-header">
              <div className="seller-avatar">{listing.seller?.name?.charAt(0)?.toUpperCase() || "S"}</div>
              <div>
                <div className="seller-name">{listing.seller?.name || "Unknown Seller"}</div>
                <div className="seller-rating">
                  <Star size={13} fill="currentColor" color="var(--warning)" />
                  <span>{listing.seller?.ratingAverage?.toFixed(1) || "New"}</span>
                  {listing.seller?.reviewCount > 0 && <span style={{ color: 'var(--text-tertiary)' }}>({listing.seller.reviewCount} reviews)</span>}
                </div>
                <div className="seller-meta">Member since {new Date(listing.seller?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}
              onClick={() => openChat(listing)} disabled={!user || listing.sellerId === user?.id}>
              <MessageCircle size={16} />{listing.sellerId === user?.id ? "Your Listing" : "Chat with Seller"}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="detail-sticky-bar">
        <div className="detail-sticky-price">৳{Number(listing.price).toLocaleString()}</div>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openChat(listing)} disabled={!user || listing.sellerId === user?.id}>
          <MessageCircle size={16} />Chat with Seller
        </button>
      </div>

      {/* Similar listings */}
      {similar.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h3 className="detail-section-title">Similar Listings</h3>
          <div className="listing-grid">
            {similar.slice(0, 3).map(s => (
              <div key={s.id} className="listing-card" onClick={() => setPage({ view: "detail", listingId: s.id })}>
                <div className="card-image-wrap"><img src={getListingVisual(s).src} alt={s.title} className="card-image" /></div>
                <div className="card-content">
                  <h3 className="card-title">{s.title}</h3>
                  <div className="card-price">৳{Number(s.price).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════ SELL (CREATE) PAGE ════════════════════════════ */

function CreatePage({ token, onCreated, pushToast }) {
  const [form, setForm] = useState({ title: "", category: "phone", brand: "", condition: "good", price: "", description: "", location: defaultLocation });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  function canAdvance() {
    if (step === 1) return form.title.trim() && form.price;
    if (step === 2) return form.brand.trim() && form.description.trim();
    return true;
  }

  async function submit() {
    setBusy(true); setScanning(true);
    try {
      let uploadedPhotos = [];
      if (photos.length > 0) {
        const fileRes = await uploadFile("/api/uploads/listing-photo", photos[0], token);
        uploadedPhotos.push(fileRes);
      }
      await api("/api/listings", { method: "POST", body: JSON.stringify({ ...form, price: Number(form.price), photos: uploadedPhotos }) }, token);
      setScanning(false);
      pushToast("Listing published", "success");
      onCreated();
    } catch (err) { setScanning(false); pushToast(err.message, "error"); }
    finally { setBusy(false); }
  }

  const previewVisual = photos.length > 0 ? URL.createObjectURL(photos[0]) : getCategoryVisual(form.category, form.title).url;

  return (
    <div className="form-container">
      <h1 className="page-title">Sell an Item</h1>
      <p className="page-subtitle mb-6">List your item securely on Radius</p>

      <div className="step-indicator">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`step-bar ${i + 1 < step ? "done" : ""} ${i + 1 === step ? "active" : ""}`} />
        ))}
      </div>

      {scanning && <RadarSweep text="Scanning listing for fraud signals…" />}

      {!scanning && step === 1 && (
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="form-group"><label className="form-label">Photos</label><FileDropzone files={photos} setFiles={setPhotos} max={5} /></div>
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. iPhone 13 Pro 256GB" /></div>
          <div className="form-group"><label className="form-label">Price (৳)</label><input type="number" className="form-input" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 85000" /></div>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setStep(2)} disabled={!canAdvance()}>Continue <ArrowRight size={16} /></button>
        </motion.div>
      )}

      {!scanning && step === 2 && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="filter-row" style={{ flexWrap: 'wrap' }}>
              {categories.map(c => <button key={c} type="button" className={`filter-pill ${form.category === c ? "active" : ""}`} onClick={() => setForm({ ...form, category: c })}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Condition</label>
            <div className="filter-row" style={{ flexWrap: 'wrap' }}>
              {conditions.map(c => <button key={c} type="button" className={`filter-pill ${form.condition === c ? "active" : ""}`} onClick={() => setForm({ ...form, condition: c })}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>)}
            </div>
          </div>
          <div className="form-group"><label className="form-label">Brand</label><input className="form-input" required value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Apple" /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe any wear and tear, included accessories..." /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={!canAdvance()}>Review <ArrowRight size={16} /></button>
          </div>
        </motion.div>
      )}

      {!scanning && step === 3 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="detail-section-title mb-3">Preview your listing</h3>
          <div className="review-card">
            <img src={previewVisual} alt="" className="review-card-img" />
            <div className="review-card-body">
              <div className="review-card-title">{form.title || "Untitled"}</div>
              <div className="review-card-price">৳{Number(form.price || 0).toLocaleString()}</div>
              <div className="card-meta" style={{ marginTop: 8 }}>
                <span className="meta-pill">{form.category}</span>
                <span className="meta-pill">{form.condition}</span>
                <span className="meta-pill">{form.brand || "Unbranded"}</span>
              </div>
              <p className="card-desc" style={{ marginTop: 8, WebkitLineClamp: 'unset' }}>{form.description}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={16} className="icon-spin" /> : <CheckCircle2 size={16} />} Publish Listing
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ════════════════════════════ MANAGE (SELLER) PAGE ════════════════════════════ */

function SellerPage({ listings, token, reload, pushToast, setPage }) {
  async function markStatus(id, status) {
    try { await api(`/api/listings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token); pushToast(`Listing marked as ${status}`, "success"); reload(); }
    catch (err) { pushToast(err.message, "error"); }
  }

  if (listings.length === 0) {
    return (
      <div className="detail-page">
        <h1 className="page-title">Manage Listings</h1>
        <EmptyState icon={Plus} title="List your first item" text="It takes under a minute to post — your neighbours are waiting" action="Start selling" onAction={() => setPage({ view: "create", listingId: null })} />
      </div>
    );
  }

  return (
    <div className="detail-page">
      <h1 className="page-title mb-6">Manage Listings</h1>
      {listings.map(item => (
        <div key={item.id} className="manage-card">
          <img src={getListingVisual(item).src} alt="" className="manage-card-thumb" />
          <div className="manage-card-body">
            <div className="manage-card-title">{item.title}</div>
            <div className="manage-card-price">৳{Number(item.price).toLocaleString()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="meta-pill">{item.status}</span>
              <TrustBadge score={item.fraud?.score ?? 0} flags={item.fraud?.flags ?? []} status={item.status} />
            </div>
            <div className="manage-card-actions">
              <select className="sort-select" value={item.status} onChange={e => markStatus(item.id, e.target.value)} style={{ fontSize: 12 }}>
                {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage({ view: "detail", listingId: item.id })}><Eye size={14} /> View</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════ CHAT PAGE ════════════════════════════ */

function ChatPage({ listing, user, token, messages, setMessages, pushToast }) {
  const [draft, setDraft] = useState("");
  const [buying, setBuying] = useState(false);
  const [tradeRequested, setTradeRequested] = useState(false);
  const [status, setStatus] = useState(listing.status);
  const messagesEnd = useRef(null);

  const isSeller = listing.sellerId === user.id;
  const canBuy = !isSeller && !tradeRequested && status !== "sold" && status !== "removed" && status !== "reserved";
  const isFlagged = (listing.fraud?.score ?? 0) >= 45 || listing.status === "review";

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    try { await api(`/api/chat/${listing.id}`, { method: "POST", body: JSON.stringify({ body: draft }) }, token); setDraft(""); }
    catch (err) { pushToast(err.message, "error"); }
  }

  async function buyFromChat() {
    setBuying(true);
    try {
      const res = await api(`/api/chat/${listing.id}/buy`, { method: "POST", body: JSON.stringify({ note: "Confirmed in buyer-seller chat." }) }, token);
      setStatus(res.item.status);
      setMessages(items => items.some(i => i.id === res.message.id) ? items : [...items, res.message]);
      setTradeRequested(true);
      pushToast("Trade request sent to the seller", "success");
    } catch (err) { pushToast(err.message, "error"); }
    finally { setBuying(false); }
  }

  return (
    <div className="chat-layout">
      <div className="chat-sidebar">
        <div className="chat-header">About Item</div>
        <div style={{ padding: 16 }}>
          <img src={getListingVisual(listing).src} alt="" style={{ borderRadius: 'var(--radius-md)', marginBottom: 12, width: '100%' }} />
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{listing.title}</div>
          <div style={{ color: 'var(--accent-end)', fontWeight: 700, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>৳{Number(listing.price).toLocaleString()}</div>
          <div className="chat-item-actions">
            <TrustBadge score={listing.fraud?.score ?? 0} flags={listing.fraud?.flags ?? []} status={status} />
            <span className="meta-pill">{status}</span>
          </div>
          {!isSeller && (
            <button className="btn btn-primary chat-buy-btn" onClick={buyFromChat} disabled={!canBuy || buying}>
              {buying ? <Loader2 size={16} className="icon-spin" /> : <PackageCheck size={16} />}
              {tradeRequested ? "Request Sent" : status === "sold" ? "Already Sold" : "Request From Chat"}
            </button>
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <span>{isSeller ? "Chat with Buyer" : `Chat with ${listing.seller?.name || "Seller"}`}</span>
          {!isSeller && (
            <button className="btn btn-primary btn-sm chat-header-buy" onClick={buyFromChat} disabled={!canBuy || buying}>
              {tradeRequested ? "Requested" : status === "sold" ? "Sold" : "Request"}
            </button>
          )}
        </div>

        <div className="chat-messages">
          {isFlagged && (
            <div className="chat-safety-banner">
              <AlertTriangle size={16} className="icon" />
              <span>This listing is under review — meet in public and inspect before paying.</span>
            </div>
          )}
          {messages.length === 0 && <EmptyState icon={MessageCircle} title="No messages yet" text="Say hello to start the conversation" />}
          {messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.senderId === user.id ? "sent" : "received"}`}>
              <div>{m.body}</div>
              <div className="chat-bubble-meta">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        <form className="chat-input-area" onSubmit={send}>
          <input className="form-input" placeholder="Type a message..." value={draft} onChange={e => setDraft(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════ ADMIN PAGE ════════════════════════════ */

function AdminPage({ admin, token, reload, pushToast }) {
  const [tab, setTab] = useState("queue");

  async function resolveFraud(id, action) {
    try {
      await api(`/api/admin/fraud-queue/${id}/decision`, { method: "POST", body: JSON.stringify({ decision: action }) }, token);
      pushToast(`Listing ${action === "remove" ? "removed" : "approved"}`, "success"); reload();
    } catch (err) { pushToast(err.message, "error"); }
  }

  return (
    <div className="detail-page" style={{ maxWidth: 1100 }}>
      <h1 className="page-title mb-6">Admin Dashboard</h1>

      {admin.stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card"><div className="admin-stat-label">Total Listings</div><div className="admin-stat-value">{admin.stats.totalListings}</div></div>
          <div className="admin-stat-card"><div className="admin-stat-label">Active Users</div><div className="admin-stat-value">{admin.stats.activeUsers}</div></div>
          <div className="admin-stat-card"><div className="admin-stat-label">Reported</div><div className="admin-stat-value" style={{ color: 'var(--warning)' }}>{admin.stats.reportedListings}</div></div>
          <div className="admin-stat-card"><div className="admin-stat-label">Fraud Caught</div><div className="admin-stat-value" style={{ color: 'var(--danger)' }}>{admin.stats.fraudCaught}</div></div>
        </div>
      )}

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>Fraud Queue ({admin.queue.length})</button>
        <button className={`admin-tab ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>Reports ({admin.reports.length})</button>
        <button className={`admin-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users ({admin.users.length})</button>
      </div>

      <div className="admin-table-wrap">
        {tab === "queue" && (
          admin.queue.length === 0
            ? <EmptyState icon={ShieldCheck} title="Queue is clean" text="No listings are waiting for review" />
            : <table className="admin-table">
                <thead><tr><th>Item</th><th>Seller</th><th>Score</th><th>Flags</th><th>Action</th></tr></thead>
                <tbody>
                  {admin.queue.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong><br /><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>৳{Number(item.price).toLocaleString()}</span></td>
                      <td>{item.seller?.name || item.sellerId}</td>
                      <td><TrustBadge score={item.fraud?.score ?? 0} flags={[]} status={item.status} /></td>
                      <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>{item.fraud?.flags?.map((f, i) => <div key={i} style={{ fontSize: 12 }}>• {f}</div>)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => resolveFraud(item.id, "allow")}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => resolveFraud(item.id, "remove")}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}
        {tab === "reports" && (
          admin.reports.length === 0
            ? <EmptyState icon={Flag} title="No reports" text="No user reports have been submitted" />
            : <table className="admin-table">
                <thead><tr><th>Target</th><th>Reporter</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>{admin.reports.map(r => (
                  <tr key={r.id}><td>{r.targetId}</td><td>{r.reporterId}</td><td>{r.reason}</td><td><span className="meta-pill">{r.status}</span></td></tr>
                ))}</tbody>
              </table>
        )}
        {tab === "users" && (
          admin.users.length === 0
            ? <EmptyState icon={UserCog} title="No users" text="No registered users yet" />
            : <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>{admin.users.map(u => (
                  <tr key={u.id}><td><strong>{u.name}</strong></td><td>{u.email}</td><td><span className="meta-pill">{u.role}</span></td><td><span className="meta-pill">{u.status}</span></td></tr>
                ))}</tbody>
              </table>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════ MOUNT ════════════════════════════ */

const root = createRoot(document.getElementById("root"));
root.render(<App />);
