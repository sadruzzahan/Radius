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
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [admin, setAdmin] = useState({ stats: null, queue: [], users: [], reports: [], ml: [] });
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
      if (msg.conversationId === selectedConversationId || (!selectedConversationId && msg.listingId === page.listingId)) {
        setMessages(m => m.some(item => item.id === msg.id) ? m : [...m, msg]);
      }
    });
    return () => socket.off("chat:message");
  }, [socket, page.listingId, selectedConversationId]);

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
      const [stats, queue, users, reports, ml] = await Promise.all([
        api("/api/admin/analytics", {}, token), api("/api/admin/fraud-queue", {}, token),
        api("/api/admin/users", {}, token), api("/api/admin/reports", {}, token),
        api("/api/admin/ml/predictions", {}, token)
      ]);
      setAdmin({ stats, queue: queue.items, users: users.items, reports: reports.items, ml: ml.items });
      setPage({ view: "admin", listingId: null });
    } catch (err) { pushToast(err.message, "error"); }
  }

  async function openChat(listing) {
    if (!user) return pushToast("Sign in to message sellers", "warning");
    socket.emit("listing:join", listing.id);
    try {
      const data = await api(`/api/chat/${listing.id}`, {}, token);
      setMessages(data.items); setSelectedListingData(listing); setSelectedConversationId(data.conversation?.id ?? null);
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
    { id: "chat", label: "Chat", Icon: MessageCircle, disabled: !user },
    { id: "admin", label: "Admin", Icon: UserCog, disabled: role !== "admin" }
  ];

  function handleNav(id, disabled) {
    if (disabled) {
      if (!user) return setAuthModal("login");
      if (id === "admin") return pushToast("This page requires admin access", "error");
    }
    if (id === "admin") loadAdmin();
    else {
      if (id !== "chat") setSelectedConversationId(null);
      setPage({ view: id, listingId: id === "chat" ? page.listingId : null });
    }
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
          {page.view === "browse" && <PT key="browse"><BrowsePage listings={listings} filters={filters} setFilters={setFilters} loadListings={loadListings} setPage={setPage} loading={loading} error={error} startSell={() => user ? setPage({ view: "create", listingId: null }) : setAuthModal("login")} /></PT>}
          {page.view === "detail" && selectedListingData && <PT key="detail"><DetailPage listing={selectedListingData} allListings={listings} setPage={setPage} openChat={openChat} token={token} user={user} pushToast={pushToast} /></PT>}
          {page.view === "create" && <PT key="create"><CreatePage token={token} onCreated={() => { setPage({ view: "browse", listingId: null }); loadListings(); }} pushToast={pushToast} /></PT>}
          {page.view === "seller" && <PT key="seller"><SellerPage listings={listings.filter(i => i.sellerId === user?.id)} token={token} reload={loadListings} pushToast={pushToast} setPage={setPage} openChat={openChat} /></PT>}
          {page.view === "chat" && <PT key="chat"><ChatPage initialListing={selectedListingData} user={user} token={token} messages={messages} setMessages={setMessages} pushToast={pushToast} selectedConversationId={selectedConversationId} setSelectedConversationId={setSelectedConversationId} setSelectedListingData={setSelectedListingData} setPage={setPage} /></PT>}
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

function getTrustSignals(listing) {
  return listing?.fraud?.flags ?? listing?.fraud?.signals ?? listing?.fraud?.explanations ?? [];
}

function getTrustState(listing) {
  const score = listing?.fraud?.score ?? 0;
  if (score >= 75 || listing?.fraud?.decision === "review") return "danger";
  if (score >= 45) return "review";
  return "verified";
}

function getTrustLabel(listing) {
  const state = getTrustState(listing);
  if (state === "danger") return "AI Review";
  if (state === "review") return "Under Review";
  return "Verified seller";
}

function formatDistance(distanceKm) {
  if (distanceKm == null) return "Nearby";
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${Number(distanceKm).toFixed(1)}km`;
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

function TrustRadar({ listings, filters, setFilters, loadListings, setPage, startSell }) {
  const nearbyListings = useMemo(() => getSortedListings(listings, "nearest").slice(0, 8), [listings]);
  const [selectedId, setSelectedId] = useState(null);
  const radarRef = useRef(null);
  const selected = nearbyListings.find(item => item.id === selectedId) ?? nearbyListings[0] ?? null;
  const maxDistance = Math.max(5, ...nearbyListings.map(item => Number(item.distanceKm ?? 0)));
  const reviewCount = listings.filter(item => getTrustState(item) !== "verified").length;
  const verifiedSellerCount = new Set(listings.filter(item => getTrustState(item) === "verified").map(item => item.sellerId)).size;
  const nodes = nearbyListings.map((listing, index) => {
    const angle = (index / Math.max(nearbyListings.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const distance = Number(listing.distanceKm ?? maxDistance * 0.45);
    const radius = 20 + Math.min(distance / maxDistance, 1) * 30;
    return {
      listing,
      state: getTrustState(listing),
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle)
    };
  });

  function handleTilt(event) {
    const rect = radarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    radarRef.current.style.setProperty("--tilt-x", `${(-py * 5).toFixed(2)}deg`);
    radarRef.current.style.setProperty("--tilt-y", `${(px * 6).toFixed(2)}deg`);
  }

  function resetTilt() {
    if (!radarRef.current) return;
    radarRef.current.style.setProperty("--tilt-x", "0deg");
    radarRef.current.style.setProperty("--tilt-y", "0deg");
  }

  function openSelected(listing = selected) {
    if (listing) setPage({ view: "detail", listingId: listing.id });
  }

  return (
    <section className="trust-hero">
      <div className="trust-hero-copy">
        <div className="eyebrow">Trust Radar</div>
        <h1>Buy and sell safely with people nearby</h1>
        <p>Nearby secondhand listings, scanned for suspicious prices, duplicate photos, and risky seller signals.</p>
        <div className="hero-search hero-search-primary">
          <span className="hero-search-icon"><Search size={18} /></span>
          <input placeholder="Search nearby phones, laptops, cameras..." value={filters.q}
            onChange={e => setFilters({ ...filters, q: e.target.value })}
            onKeyDown={e => e.key === "Enter" && loadListings({ q: filters.q })} />
          <button className="hero-search-btn" onClick={() => loadListings({ q: filters.q })}>Search</button>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => document.querySelector(".filter-bar")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Browse Nearby Listings</button>
          <button className="btn btn-secondary" onClick={startSell}>Sell an Item</button>
        </div>
        <div className="trust-radar-stats">
          <span><strong>{listings.length}</strong> nearby listings</span>
          <span><strong>{reviewCount}</strong> under AI review</span>
          <span><strong>{verifiedSellerCount}</strong> verified sellers</span>
        </div>
      </div>
      <div className="trust-radar-shell" ref={radarRef} onPointerMove={handleTilt} onPointerLeave={resetTilt}>
        <div className="trust-radar-panel">
          <div className="trust-radar-depth trust-radar-depth-a" />
          <div className="trust-radar-depth trust-radar-depth-b" />
          <div className="trust-radar-sweep" />
          <div className="trust-radar-ring trust-radar-ring-1"><span>500m</span></div>
          <div className="trust-radar-ring trust-radar-ring-2"><span>2km</span></div>
          <div className="trust-radar-ring trust-radar-ring-3"><span>5km</span></div>
          <div className="trust-radar-center"><Home size={16} /></div>
          {nodes.map(({ listing, state, x, y }) => {
            const visual = getListingVisual(listing, API_URL);
            return (
              <button
                key={listing.id}
                type="button"
                className={`trust-radar-node ${state} ${selected?.id === listing.id ? "selected" : ""}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseEnter={() => setSelectedId(listing.id)}
                onFocus={() => setSelectedId(listing.id)}
                onClick={() => setSelectedId(listing.id)}
                aria-label={`${listing.title}, ${formatDistance(listing.distanceKm)} away`}
              >
                <img src={visual.src} alt="" />
                <span className="trust-radar-node-distance">{formatDistance(listing.distanceKm)}</span>
              </button>
            );
          })}
          {selected && (
            <motion.div
              key={selected.id}
              className={`trust-radar-card ${getTrustState(selected)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            >
              <img src={getListingVisual(selected, API_URL).src} alt="" />
              <div className="trust-radar-card-body">
                <strong>{selected.title}</strong>
                <span className="trust-radar-price">৳{Number(selected.price).toLocaleString()}</span>
                <span>{formatDistance(selected.distanceKm)} away</span>
                <span>{getTrustLabel(selected)}{getTrustSignals(selected)[0] ? `: ${getTrustSignals(selected)[0]}` : ""}</span>
                <button className="btn btn-primary btn-sm" onClick={() => openSelected(selected)}>
                  {getTrustState(selected) === "verified" ? "View Listing" : "Review Details"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function BrowsePage({ listings, filters, setFilters, loadListings, setPage, loading, error, startSell }) {
  return (
    <div className="browse-page">
      <TrustRadar listings={listings} filters={filters} setFilters={setFilters} loadListings={loadListings} setPage={setPage} startSell={startSell} />

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
                  <TrustBadge score={listing.fraud?.score ?? 0} flags={getTrustSignals(listing)} status={listing.status} />
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
  const flags = getTrustSignals(listing);

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
    <div className="form-page page-fill">
      <div className="form-container">
        <h1 className="page-title">Sell an Item</h1>
        <p className="page-subtitle mb-6">List your item securely on Radius</p>

        <div className="step-indicator">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`step-bar ${i + 1 < step ? "done" : ""} ${i + 1 === step ? "active" : ""}`} />
          ))}
        </div>
      </div>

      <div className="sell-workspace">
        <div className="sell-form-panel">
          {scanning && <RadarSweep text="Scanning listing for fraud signals…" />}

          {!scanning && step === 1 && (
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
              <div className="form-group"><label className="form-label">Photos</label><FileDropzone files={photos} setFiles={setPhotos} max={5} /></div>
              <div className="form-group"><label className="form-label">Title</label><input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. iPhone 13 Pro 256GB" /></div>
              <div className="form-group"><label className="form-label">Price (৳)</label><input type="number" className="form-input" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 85000" /></div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)} disabled={!canAdvance()}>Continue <ArrowRight size={16} /></button>
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
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={!canAdvance()}>Review <ArrowRight size={16} /></button>
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

        {!scanning && (
          <aside className="sell-preview-panel">
            <div className="detail-section-title">Live Preview</div>
            <div className="review-card sell-preview-card">
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
            <div className="trust-scan-card sell-trust-preview">
              <div className="trust-scan-header">
                <span className="detail-section-title" style={{ margin: 0 }}>Trust Scan</span>
                <span className="trust-badge verified"><ShieldCheck className="icon" />Ready</span>
              </div>
              <div className="trust-scan-bar-track"><div className="trust-scan-bar-fill" style={{ width: "18%", backgroundColor: "var(--verified)" }} /></div>
              <div className="trust-scan-flag" style={{ color: 'var(--verified)' }}><ShieldCheck className="icon" /><span>Photos and pricing will be checked before publishing</span></div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════ MANAGE (SELLER) PAGE ════════════════════════════ */

function SellerPage({ listings, token, reload, pushToast, setPage, openChat }) {
  const manageStats = {
    active: listings.filter(item => item.status === "available").length,
    reserved: listings.filter(item => item.status === "reserved").length,
    sold: listings.filter(item => item.status === "sold").length,
    review: listings.filter(item => getTrustState(item) !== "verified").length
  };

  async function markStatus(id, status) {
    try { await api(`/api/listings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token); pushToast(`Listing marked as ${status}`, "success"); reload(); }
    catch (err) { pushToast(err.message, "error"); }
  }

  if (listings.length === 0) {
    return (
      <div className="manage-page page-fill">
        <div className="manage-hero">
          <div>
            <h1 className="page-title">Inventory Manager</h1>
            <p className="page-subtitle">Published listings will appear here with status, trust, and buyer controls.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setPage({ view: "create", listingId: null })}><Plus size={16} /> New Listing</button>
        </div>
        <EmptyState icon={Plus} title="List your first item" text="It takes under a minute to post — your neighbours are waiting" action="Start selling" onAction={() => setPage({ view: "create", listingId: null })} />
      </div>
    );
  }

  return (
    <div className="manage-page page-fill">
      <div className="manage-hero">
        <div>
          <h1 className="page-title">Inventory Manager</h1>
          <p className="page-subtitle">Track listing health, buyer readiness, and sale status after publishing.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPage({ view: "create", listingId: null })}><Plus size={16} /> New Listing</button>
      </div>

      <div className="manage-stats">
        <div><span>Active</span><strong>{manageStats.active}</strong></div>
        <div><span>Reserved</span><strong>{manageStats.reserved}</strong></div>
        <div><span>Sold</span><strong>{manageStats.sold}</strong></div>
        <div><span>Needs Review</span><strong>{manageStats.review}</strong></div>
      </div>

      <div className="manage-board">
        {listings.map(item => {
          const visual = getListingVisual(item, API_URL);
          const signals = getTrustSignals(item);
          return (
            <div key={item.id} className={`manage-card manage-card-${item.status}`}>
              <img src={visual.src} alt="" className="manage-card-thumb" />
              <div className="manage-card-body">
                <div className="manage-card-top">
                  <div>
                    <div className="manage-card-title">{item.title}</div>
                    <div className="manage-card-price">৳{Number(item.price).toLocaleString()}</div>
                  </div>
                  <span className={`manage-status-dot ${item.status}`} />
                </div>
                <div className="manage-card-meta">
                  <span className="meta-pill">{item.category}</span>
                  <span className="meta-pill">{item.condition}</span>
                  <span className="meta-pill">{item.status}</span>
                  <TrustBadge score={item.fraud?.score ?? 0} flags={signals} status={item.status} />
                </div>
                <div className="manage-health">
                  <div className="manage-health-row"><span>Trust scan</span><strong>{getTrustLabel(item)}</strong></div>
                  <div className="trust-scan-bar-track"><div className="trust-scan-bar-fill" style={{ width: `${Math.max(item.fraud?.score ?? 0, 4)}%`, backgroundColor: getTrustState(item) === "danger" ? "var(--danger)" : getTrustState(item) === "review" ? "var(--warning)" : "var(--verified)" }} /></div>
                  <div className="manage-health-note">{signals[0] ?? "No risk factors detected"}</div>
                </div>
                <div className="manage-card-actions">
                  <select className="sort-select" value={item.status} onChange={e => markStatus(item.id, e.target.value)} style={{ fontSize: 12 }}>
                    {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage({ view: "detail", listingId: item.id })}><Eye size={14} /> View</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openChat(item)}><MessageCircle size={14} /> Chats</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════ CHAT PAGE ════════════════════════════ */

function ChatPage({ initialListing, user, token, messages, setMessages, pushToast, selectedConversationId, setSelectedConversationId, setSelectedListingData, setPage }) {
  const [conversations, setConversations] = useState([]);
  const [listing, setListing] = useState(initialListing);
  const [draft, setDraft] = useState("");
  const [buying, setBuying] = useState(false);
  const [tradeBusy, setTradeBusy] = useState("");
  const [trades, setTrades] = useState([]);
  const [tradeRequested, setTradeRequested] = useState(false);
  const [status, setStatus] = useState(initialListing?.status ?? "available");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const messagesEnd = useRef(null);

  const activeConversation = conversations.find(item => item.id === selectedConversationId) ?? null;
  const threadListing = listing ?? activeConversation?.listing ?? null;
  const isSeller = threadListing?.sellerId === user.id;
  const activeTrade = trades.find(trade => ["requested", "accepted"].includes(trade.status));
  const canBuy = Boolean(threadListing) && !isSeller && !activeTrade && !tradeRequested && status !== "sold" && status !== "removed" && status !== "reserved";
  const isFlagged = Boolean(threadListing) && ((threadListing.fraud?.score ?? 0) >= 45 || threadListing.status === "review");

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  useEffect(() => {
    let active = true;
    async function loadInbox() {
      setLoadingInbox(true);
      try {
        const data = await api("/api/chat", {}, token);
        if (!active) return;
        const items = data.items ?? [];
        setConversations(items);
        const preferred = selectedConversationId
          ? items.find(item => item.id === selectedConversationId)
          : items.find(item => item.listingId === initialListing?.id) ?? items[0];
        if (preferred) await selectConversation(preferred, { silent: true });
        else {
          setMessages([]);
          setListing(null);
          setSelectedConversationId(null);
        }
      } catch (err) {
        if (active) pushToast(err.message, "error");
      } finally {
        if (active) setLoadingInbox(false);
      }
    }
    loadInbox();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!threadListing) return;
    api(`/api/chat/${threadListing.id}/trades`, {}, token)
      .then(data => {
        setTrades(data.items ?? []);
        setTradeRequested((data.items ?? []).some(trade => ["requested", "accepted"].includes(trade.status)));
      })
      .catch(() => {});
  }, [threadListing?.id, token]);

  async function refreshInbox() {
    const data = await api("/api/chat", {}, token);
    setConversations(data.items ?? []);
  }

  async function selectConversation(conversation, options = {}) {
    const conversationListing = conversation.listing;
    if (!conversationListing) return;
    try {
      const data = await api(`/api/chat/${conversationListing.id}?conversationId=${conversation.id}`, {}, token);
      const nextListing = { ...conversationListing, seller: conversation.seller };
      setListing(nextListing);
      setSelectedListingData(nextListing);
      setSelectedConversationId(conversation.id);
      setMessages(data.items ?? []);
      setStatus(conversationListing.status);
      setDraft("");
      setPage({ view: "chat", listingId: conversationListing.id });
      if (!options.silent) await refreshInbox();
    } catch (err) {
      pushToast(err.message, "error");
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!draft.trim() || !threadListing || !selectedConversationId) return;
    try {
      const res = await api(`/api/chat/${threadListing.id}`, { method: "POST", body: JSON.stringify({ body: draft, conversationId: selectedConversationId }) }, token);
      setMessages(items => items.some(i => i.id === res.item.id) ? items : [...items, res.item]);
      setDraft("");
      await refreshInbox();
    }
    catch (err) { pushToast(err.message, "error"); }
  }

  async function buyFromChat() {
    if (!threadListing) return;
    setBuying(true);
    try {
      const res = await api(`/api/chat/${threadListing.id}/buy`, { method: "POST", body: JSON.stringify({ note: "Confirmed in buyer-seller chat." }) }, token);
      setStatus(res.item.status);
      setSelectedConversationId(res.conversation?.id ?? selectedConversationId);
      setMessages(items => items.some(i => i.id === res.message.id) ? items : [...items, res.message]);
      setTrades(items => [res.trade, ...items.filter(item => item.id !== res.trade.id)]);
      setTradeRequested(true);
      await refreshInbox();
      pushToast("Trade request sent to the seller", "success");
    } catch (err) { pushToast(err.message, "error"); }
    finally { setBuying(false); }
  }

  async function updateTrade(trade, action) {
    if (!threadListing) return;
    setTradeBusy(`${trade.id}:${action}`);
    try {
      const res = await api(`/api/chat/${threadListing.id}/trades/${trade.id}/${action}`, { method: "POST" }, token);
      setStatus(res.item?.status ?? status);
      setTrades(items => items.map(item => item.id === trade.id ? res.trade : item));
      setMessages(items => items.some(i => i.id === res.message.id) ? items : [...items, res.message]);
      setTradeRequested(["requested", "accepted"].includes(res.trade.status));
      await refreshInbox();
      pushToast(`Trade ${res.trade.status}`, "success");
    } catch (err) { pushToast(err.message, "error"); }
    finally { setTradeBusy(""); }
  }

  function quickReply(text) {
    setDraft(value => value ? `${value} ${text}` : text);
  }

  return (
    <div className="chat-layout inbox-layout">
      <aside className="inbox-panel">
        <div className="chat-header">
          <div className="chat-title-wrap">
            <span>Inbox</span>
            <small>{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</small>
          </div>
          <button className="icon-btn" onClick={refreshInbox} aria-label="Refresh inbox"><Loader2 size={15} className={loadingInbox ? "icon-spin" : ""} /></button>
        </div>
        <div className="inbox-list">
          {loadingInbox && conversations.length === 0 && Array.from({ length: 5 }).map((_, index) => <div key={index} className="inbox-skeleton" />)}
          {!loadingInbox && conversations.length === 0 && (
            <EmptyState icon={MessageCircle} title="No conversations" text="Open a listing and message the seller to start your inbox" />
          )}
          {conversations.map(conversation => {
            const other = conversation.buyerId === user.id ? conversation.seller : conversation.buyer;
            const item = conversation.listing;
            const selected = conversation.id === selectedConversationId;
            return (
              <button key={conversation.id} className={`inbox-thread ${selected ? "active" : ""}`} onClick={() => selectConversation(conversation)}>
                <img src={getListingVisual(item).src} alt="" />
                <span className="inbox-thread-body">
                  <span className="inbox-thread-top">
                    <strong>{other?.name ?? "Marketplace user"}</strong>
                    <small>{conversation.lastMessage?.createdAt ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</small>
                  </span>
                  <span className="inbox-thread-title">{item?.title ?? "Listing unavailable"}</span>
                  <span className="inbox-thread-preview">{conversation.lastMessage?.body ?? "No messages yet"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="chat-main">
        {!threadListing ? (
          <div className="chat-empty-thread">
            <EmptyState icon={MessageCircle} title="Select a conversation" text="Your buyer and seller messages will appear here" />
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-title-wrap">
                <span>{isSeller ? `Buyer: ${activeConversation?.buyer?.name ?? "Buyer"}` : `Seller: ${threadListing.seller?.name || activeConversation?.seller?.name || "Seller"}`}</span>
                <small>{threadListing.title} · ৳{Number(threadListing.price).toLocaleString()}</small>
              </div>
              <button className="btn btn-secondary btn-sm chat-header-buy" onClick={() => setPage({ view: "detail", listingId: threadListing.id })}>
                <Eye size={14} /> Listing
              </button>
              {!isSeller && (
                <button className="btn btn-primary btn-sm chat-header-buy" onClick={buyFromChat} disabled={!canBuy || buying}>
                  {tradeRequested ? "Requested" : status === "sold" ? "Sold" : "Request"}
                </button>
              )}
            </div>

            <div className="chat-messages">
              <div className="chat-mobile-item">
                <img src={getListingVisual(threadListing).src} alt="" />
                <div>
                  <strong>{threadListing.title}</strong>
                  <span>৳{Number(threadListing.price).toLocaleString()} · {status}</span>
                </div>
              </div>
              <div className="chat-thread-item-card">
                <img src={getListingVisual(threadListing).src} alt="" />
                <div>
                  <strong>{threadListing.title}</strong>
                  <span>৳{Number(threadListing.price).toLocaleString()} · {status}</span>
                  <div className="chat-item-actions">
                    <TrustBadge score={threadListing.fraud?.score ?? 0} flags={getTrustSignals(threadListing)} status={status} />
                    <span className="meta-pill">{threadListing.category}</span>
                  </div>
                </div>
              </div>
              {isFlagged && (
                <div className="chat-safety-banner">
                  <AlertTriangle size={16} className="icon" />
                  <span>This listing is under review — meet in public and inspect before paying.</span>
                </div>
              )}
              {trades.length > 0 && (
                <div className="trade-panel">
                  <div className="trade-panel-title"><PackageCheck size={15} /> Trade status</div>
                  {trades.slice(0, 2).map(trade => (
                    <div key={trade.id} className="trade-row">
                      <div>
                        <strong>{trade.status}</strong>
                        <span>৳{Number(trade.price).toLocaleString()}</span>
                      </div>
                      <div className="trade-actions">
                        {isSeller && trade.status === "requested" && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => updateTrade(trade, "accept")} disabled={Boolean(tradeBusy)}>Accept</button>
                            <button className="btn btn-danger btn-sm" onClick={() => updateTrade(trade, "reject")} disabled={Boolean(tradeBusy)}>Reject</button>
                          </>
                        )}
                        {trade.status === "accepted" && <button className="btn btn-primary btn-sm" onClick={() => updateTrade(trade, "complete")} disabled={Boolean(tradeBusy)}>Complete</button>}
                        {["requested", "accepted"].includes(trade.status) && <button className="btn btn-secondary btn-sm" onClick={() => updateTrade(trade, "cancel")} disabled={Boolean(tradeBusy)}>Cancel</button>}
                      </div>
                    </div>
                  ))}
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
              <div className="quick-replies">
                <button type="button" onClick={() => quickReply("Is this still available?")}>Available?</button>
                <button type="button" onClick={() => quickReply("Can we meet in a public place?")}>Public meetup</button>
                <button type="button" onClick={() => quickReply("Can I inspect before payment?")}>Inspect first</button>
                <button type="button" onClick={() => quickReply("Can you share the exact pickup location and a fresh photo?")}>Trust question</button>
              </div>
              <input className="form-input" placeholder="Type a message..." value={draft} onChange={e => setDraft(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}><Send size={16} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════ ADMIN PAGE ════════════════════════════ */

function AdminPage({ admin, token, reload, pushToast }) {
  const [tab, setTab] = useState("queue");
  const [busyId, setBusyId] = useState("");
  const stats = {
    totalListings: admin.stats?.totalListings ?? admin.stats?.listings ?? 0,
    activeUsers: admin.stats?.activeUsers ?? admin.stats?.users ?? 0,
    reportedListings: admin.stats?.reportedListings ?? admin.stats?.openReports ?? 0,
    fraudCaught: admin.stats?.fraudCaught ?? admin.stats?.flaggedListings ?? 0
  };
  const mlRuns = admin.ml ?? [];

  async function resolveFraud(id, action) {
    setBusyId(`${id}:${action}`);
    try {
      await api(`/api/admin/fraud-queue/${id}/decision`, { method: "POST", body: JSON.stringify({ decision: action }) }, token);
      pushToast(`Listing ${action === "remove" ? "removed" : "approved"}`, "success"); reload();
    } catch (err) { pushToast(err.message, "error"); }
    finally { setBusyId(""); }
  }

  async function resolveReport(id, status) {
    setBusyId(`${id}:${status}`);
    try {
      await api(`/api/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
      pushToast(`Report ${status}`, "success"); reload();
    } catch (err) { pushToast(err.message, "error"); }
    finally { setBusyId(""); }
  }

  async function updateUserStatus(id, status) {
    setBusyId(`${id}:${status}`);
    try {
      await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
      pushToast(`User marked ${status}`, "success"); reload();
    } catch (err) { pushToast(err.message, "error"); }
    finally { setBusyId(""); }
  }

  return (
    <div className="admin-page page-fill">
      <div className="admin-hero">
        <div>
          <h1 className="page-title">Admin Command Center</h1>
          <p className="page-subtitle">Review fraud signals, user reports, and account access from one operational view.</p>
        </div>
        <button className="btn btn-secondary" onClick={reload}><Loader2 size={15} /> Refresh</button>
      </div>

      {admin.stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card"><div className="admin-stat-label">Total Listings</div><div className="admin-stat-value">{stats.totalListings}</div></div>
          <div className="admin-stat-card"><div className="admin-stat-label">Active Users</div><div className="admin-stat-value">{stats.activeUsers}</div></div>
          <div className="admin-stat-card"><div className="admin-stat-label">Reported</div><div className="admin-stat-value" style={{ color: 'var(--warning)' }}>{stats.reportedListings}</div></div>
          <div className="admin-stat-card"><div className="admin-stat-label">Fraud Caught</div><div className="admin-stat-value" style={{ color: 'var(--danger)' }}>{stats.fraudCaught}</div></div>
        </div>
      )}

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>Fraud Queue ({admin.queue.length})</button>
        <button className={`admin-tab ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>Reports ({admin.reports.length})</button>
        <button className={`admin-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users ({admin.users.length})</button>
        <button className={`admin-tab ${tab === "ml" ? "active" : ""}`} onClick={() => setTab("ml")}>ML Log ({mlRuns.length})</button>
      </div>

      <div className="admin-table-wrap admin-table-panel">
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
                      <td><TrustBadge score={item.fraud?.score ?? 0} flags={getTrustSignals(item)} status={item.status} /></td>
                      <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>
                        <div className="admin-signal-list">
                          {getTrustSignals(item).map((f, i) => <span key={i}>{f}</span>)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => resolveFraud(item.id, "allow")} disabled={Boolean(busyId)}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => resolveFraud(item.id, "remove")} disabled={Boolean(busyId)}>Remove</button>
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
                <thead><tr><th>Listing</th><th>Reporter</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{admin.reports.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.listing?.title ?? r.listingId}</strong><br /><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{r.details || "No extra details"}</span></td>
                    <td>{r.reporter?.name ?? r.reporterId}<br /><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{r.reporter?.email ?? ""}</span></td>
                    <td><span className="meta-pill">{r.reason}</span></td>
                    <td><span className="meta-pill">{r.status}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => resolveReport(r.id, r.status === "resolved" ? "open" : "resolved")} disabled={Boolean(busyId)}>
                        {r.status === "resolved" ? "Reopen" : "Resolve"}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
        )}
        {tab === "users" && (
          admin.users.length === 0
            ? <EmptyState icon={UserCog} title="No users" text="No registered users yet" />
            : <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{admin.users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong><br /><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{u.reviewCount ?? 0} reviews · {Number(u.ratingAverage ?? 0).toFixed(1)} rating</span></td>
                    <td>{u.email}</td>
                    <td><span className="meta-pill">{u.role}</span></td>
                    <td><span className="meta-pill">{u.status}</span></td>
                    <td>
                      <select className="sort-select" value={u.status} onChange={e => updateUserStatus(u.id, e.target.value)} disabled={u.role === "admin" || Boolean(busyId)}>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
        )}
        {tab === "ml" && (
          mlRuns.length === 0
            ? <EmptyState icon={ShieldAlert} title="No model runs" text="Listing submissions will appear here with score diagnostics" />
            : <table className="admin-table">
                <thead><tr><th>Run</th><th>Score</th><th>Decision</th><th>Signals</th><th>Feature Snapshot</th></tr></thead>
                <tbody>{mlRuns.map(run => {
                  const raw = run.rawResponse ?? {};
                  const features = raw.feature_snapshot ?? raw.featureSnapshot ?? {};
                  const scores = raw.component_scores ?? raw.componentScores ?? {};
                  const signals = run.signals?.length ? run.signals : raw.signals ?? [];
                  return (
                    <tr key={run.id}>
                      <td>
                        <strong>{run.modelVersion ?? "unknown"}</strong><br />
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{run.listingId ?? "No listing"} · {run.createdAt ? new Date(run.createdAt).toLocaleString() : "Pending"}</span>
                      </td>
                      <td>
                        <div className="ml-score">{Math.round(Number(run.score ?? 0))}</div>
                        <div className="trust-scan-bar-track"><div className="trust-scan-bar-fill" style={{ width: `${Math.max(Number(run.score ?? 0), 4)}%`, backgroundColor: Number(run.score ?? 0) >= 60 ? "var(--danger)" : Number(run.score ?? 0) >= 40 ? "var(--warning)" : "var(--verified)" }} /></div>
                      </td>
                      <td><span className="meta-pill">{run.decision}</span><br /><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{run.thresholdBand ?? raw.threshold_band ?? "allow"}</span></td>
                      <td style={{ maxWidth: 300, whiteSpace: 'normal' }}>
                        <div className="admin-signal-list">
                          {signals.map((signal, i) => <span key={`${run.id}-${signal}-${i}`}>{signal}{scores[signal] != null ? ` ${scores[signal] > 0 ? "+" : ""}${scores[signal]}` : ""}</span>)}
                        </div>
                      </td>
                      <td>
                        <div className="ml-feature-grid">
                          <span>৳{Number(features.price ?? 0).toLocaleString()}</span>
                          <span>{features.category ?? "category"}</span>
                          <span>{features.photo_hash_count ?? 0} photos</span>
                          <span>{features.existing_hash_count ?? 0} hashes</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════ MOUNT ════════════════════════════ */

const root = createRoot(document.getElementById("root"));
root.render(<App />);
