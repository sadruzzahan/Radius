import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Filter,
  Flag,
  Home,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserCog,
  X
} from "lucide-react";
import { API_URL, api, uploadFile } from "./api.js";
import { getCategoryVisual, getListingVisual } from "./visualManifest.js";
import "./styles.css";

const defaultLocation = { lat: 23.7465, lng: 90.376 };
const categories = ["phone", "laptop", "camera", "furniture", "bicycle", "appliance", "fashion", "books", "gaming", "accessories"];
const conditions = ["new", "excellent", "good", "fair", "poor"];
const statuses = ["available", "reserved", "sold"];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") ?? "");
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [page, setPage] = useState({ view: "browse", listingId: null });
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ q: "", category: "", condition: "", status: "", minPrice: "", maxPrice: "", radiusKm: 8, lat: defaultLocation.lat, lng: defaultLocation.lng });
  const [selectedListingData, setSelectedListingData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [admin, setAdmin] = useState({ stats: null, queue: [], users: [], reports: [] });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const socket = useMemo(() => io(API_URL || undefined, { autoConnect: true }), []);
  const role = user?.role ?? "guest";

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", {}, token)
      .then((res) => setUser(res.user?.id ? res.user : null))
      .catch(() => {
        localStorage.removeItem("token");
        setToken("");
      });
  }, [token]);

  useEffect(() => {
    if (page.view === "browse") {
      loadListings();
    }
  }, [filters.category, filters.condition, filters.status, filters.minPrice, filters.maxPrice, filters.radiusKm, filters.lat, filters.lng, page.view]);

  useEffect(() => {
    if (page.view === "detail" && page.listingId) {
      const found = listings.find((l) => l.id === page.listingId);
      if (found) {
        setSelectedListingData(found);
      } else {
        // If listing not in current list (e.g. direct link), load it
        api(`/api/listings/${page.listingId}`, {}, token)
          .then((data) => setSelectedListingData(data))
          .catch((err) => setNotice(err.message));
      }
    }
  }, [page.view, page.listingId, listings, token]);

  useEffect(() => {
    socket.on("chat:message", (message) => {
      if (message.listingId === page.listingId) setMessages((items) => [...items, message]);
    });
    return () => socket.off("chat:message");
  }, [socket, page.listingId]);

  async function loadListings(extra = {}) {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
      if (value !== "" && value != null) params.set(key, value);
    });
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/listings?${params.toString()}`, {}, token);
      setListings(data.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      setNotice(`Signed in as ${data.user.name}`);
      setAuthModal(null);
    } catch (err) {
      throw err;
    }
  }

  async function register(name, email, password) {
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, location: defaultLocation })
      });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      setNotice("Account created successfully");
      setAuthModal(null);
    } catch (err) {
      throw err;
    }
  }

  async function loadAdmin() {
    try {
      const [stats, queue, users, reports] = await Promise.all([
        api("/api/admin/analytics", {}, token),
        api("/api/admin/fraud-queue", {}, token),
        api("/api/admin/users", {}, token),
        api("/api/admin/reports", {}, token)
      ]);
      setAdmin({ stats, queue: queue.items, users: users.items, reports: reports.items });
      setPage({ view: "admin", listingId: null });
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function openChat(listing) {
    if (!user) return setNotice("Register or login to message sellers");
    socket.emit("listing:join", listing.id);
    try {
      const data = await api(`/api/chat/${listing.id}`, {}, token);
      setMessages(data.items);
      setPage({ view: "chat", listingId: listing.id });
    } catch (err) {
      setNotice(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setPage({ view: "browse", listingId: null });
  }

  const nav = [
    { id: "browse", label: "Browse", Icon: Search, disabled: false },
    { id: "create", label: "Sell", Icon: Plus, disabled: !user },
    { id: "seller", label: "Manage", Icon: PackageCheck, disabled: !user },
    { id: "chat", label: "Chat", Icon: MessageCircle, disabled: !page.listingId || !user },
    { id: "admin", label: "Admin", Icon: UserCog, disabled: role !== "admin" }
  ];

  return (
    <main>
      <header className="topnav">
        <div className="topnav-brand cursor-pointer" onClick={() => setPage({ view: "browse", listingId: null })}>
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '22px', height: '22px', color: 'var(--accent)' }}>
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.8" />
            <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" strokeOpacity="0.5" />
            <path d="M12 12C12 10.5 16 9 16 9C16 9 20 10.5 20 12C20 16 16 19 16 19C16 19 12 16 12 12Z" fill="currentColor" />
          </svg>
          <span style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: '18px' }}>Radius</span>
        </div>
        <div className="topnav-center">
          {nav.map(({ id, label, disabled }) => (
            <button 
              key={id} 
              className={`topnav-item ${page.view === id ? "active" : ""}`} 
              onClick={() => {
                if (disabled) {
                  if (!user) return setAuthModal("login");
                  if (id === "chat") return setNotice("Open a listing to view its chat");
                  if (id === "admin") return setNotice("Requires admin privileges");
                }
                id === "admin" ? loadAdmin() : setPage({ view: id, listingId: id === "chat" ? page.listingId : null });
              }} 
              style={{ opacity: disabled ? 0.5 : 1 }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="topnav-right">
          {user ? (
            <>
              <span className="user-info">{user.name}</span>
              <button className="btn btn-secondary" onClick={logout}><LogOut size={16} /> Logout</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setAuthModal("login")}><LogIn size={16} /> Login</button>
              <button className="btn btn-primary" onClick={() => setAuthModal("register")}><Home size={16} /> Register</button>
            </>
          )}
        </div>
      </header>

      <div className="content">
        <AnimatePresence>
          {notice && (
            <motion.div 
              className="form-message success" 
              style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 100 }}
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <span><CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> {notice}</span>
                <button onClick={() => setNotice("")}><X size={14} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {authModal && (
            <AuthModal 
              key="auth-modal"
              mode={authModal} 
              setMode={setAuthModal} 
              onClose={() => setAuthModal(null)}
              onLogin={login}
              onRegister={register}
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {page.view === "browse" && (
            <PageTransition key="browse">
              <BrowsePage 
                listings={listings} 
                filters={filters} 
                setFilters={setFilters} 
                loadListings={loadListings} 
                setPage={setPage}
                loading={loading} 
                error={error} 
              />
            </PageTransition>
          )}
          {page.view === "detail" && selectedListingData && (
            <PageTransition key="detail">
              <DetailPage 
                listing={selectedListingData} 
                setPage={setPage} 
                openChat={openChat} 
                token={token} 
                user={user} 
                setNotice={setNotice}
              />
            </PageTransition>
          )}
          {page.view === "create" && (
            <PageTransition key="create">
              <CreatePage 
                token={token} 
                onCreated={() => { setPage({ view: "browse", listingId: null }); loadListings(); }} 
                setNotice={setNotice}
              />
            </PageTransition>
          )}
          {page.view === "seller" && (
            <PageTransition key="seller">
              <SellerPage 
                listings={listings.filter((item) => item.sellerId === user?.id)} 
                token={token} 
                reload={loadListings} 
                setNotice={setNotice}
              />
            </PageTransition>
          )}
          {page.view === "chat" && selectedListingData && (
            <PageTransition key="chat">
              <ChatPage 
                listing={selectedListingData} 
                user={user} 
                token={token} 
                messages={messages} 
                setNotice={setNotice}
              />
            </PageTransition>
          )}
          {page.view === "admin" && (
            <PageTransition key="admin">
              <AdminPage 
                admin={admin} 
                token={token} 
                reload={loadAdmin} 
                setNotice={setNotice}
              />
            </PageTransition>
          )}
        </AnimatePresence>
      </div>

      <nav className="mobile-nav">
        {nav.map(({ id, label, Icon, disabled }) => (
          <button 
            key={id} 
            className={`mobile-nav-item ${page.view === id ? "active" : ""}`} 
            onClick={() => {
              if (disabled) {
                if (!user) return setAuthModal("login");
                if (id === "chat") return setNotice("Open a listing to view its chat");
                if (id === "admin") return setNotice("Requires admin privileges");
              }
              id === "admin" ? loadAdmin() : setPage({ view: id, listingId: id === "chat" ? page.listingId : null });
            }}
            style={{ opacity: disabled ? 0.5 : 1 }}
          >
            <Icon size={20} />
            <span className="mobile-nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function AuthModal({ mode, setMode, onClose, onLogin, onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onRegister(name, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <motion.div 
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{isLogin ? "Welcome back" : "Create an account"}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        {error && <div className="form-message error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="modal-body">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }} disabled={loading}>
            {loading ? <Loader2 size={16} className="icon" style={{ animation: 'spin 1s linear infinite' }} /> : isLogin ? "Sign In" : "Register"}
          </button>
        </form>
        
        <div className="modal-footer">
          {isLogin ? (
            <span>Don't have an account? <button className="text-link" onClick={() => setMode("register")}>Register</button></span>
          ) : (
            <span>Already have an account? <button className="text-link" onClick={() => setMode("login")}>Sign In</button></span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PageTransition({ children }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function TrustBadge({ score, status }) {
  const isSafe = score < 45;
  const isReview = score >= 45 && score < 75;
  const isDanger = score >= 75;
  
  let type = "safe";
  let Icon = ShieldCheck;
  
  if (isDanger) { type = "danger"; Icon = ShieldAlert; }
  else if (isReview) { type = "review"; Icon = AlertTriangle; }
  
  if (status === "review") {
    type = "review";
    Icon = Clock3;
  }
  
  return (
    <div className={`trust-badge ${type}`}>
      <Icon className="icon" />
      <span>{score}</span>
    </div>
  );
}

function BrowsePage({ listings, filters, setFilters, loadListings, setPage, loading, error }) {
  const inReviewCount = listings.filter((item) => item.fraud?.decision === "review").length;
  
  return (
    <div>
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            AI-Screened Hyperlocal Trade
          </div>
          <h1 className="hero-title">
            The Safe Way to <span className="text-glow">Trade Nearby</span>
          </h1>
          <p className="hero-subtitle">
            Dhaka's verified neighbor marketplace. Protected by real-time trust scoring, automated fraud screening, and buyer-seller chat.
          </p>
          
          <div className="hero-search-wrapper">
            <Search className="hero-search-icon" />
            <input 
              className="hero-search-input"
              placeholder="What are you looking for today? (e.g. iPhone, laptop, camera...)" 
              value={filters.q} 
              onChange={(e) => setFilters({ ...filters, q: e.target.value })} 
              onKeyDown={(e) => e.key === "Enter" && loadListings({ q: filters.q })}
            />
            <button className="hero-search-btn" onClick={() => loadListings({ q: filters.q })}>
              Search
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat-item">
              <span className="hero-stat-val">Dhaka</span>
              <span className="hero-stat-lbl">Active Region</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">{listings.length}</span>
              <span className="hero-stat-lbl">Listed Items</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">{inReviewCount}</span>
              <span className="hero-stat-lbl">Under Security Review</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-glow-blob color-1"></div>
          <div className="hero-glow-blob color-2"></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Category</div>
          <div className="filter-chips" style={{ paddingBottom: '4px', marginBottom: 0 }}>
            <button 
              className={`filter-pill ${filters.category === "" ? "active" : ""}`}
              onClick={() => setFilters({ ...filters, category: "" })}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                className={`filter-pill ${filters.category === cat ? "active" : ""}`}
                onClick={() => setFilters({ ...filters, category: cat })}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Condition</div>
          <div className="filter-chips" style={{ paddingBottom: '4px', marginBottom: 0 }}>
            <button 
              className={`filter-pill ${filters.condition === "" ? "active" : ""}`}
              onClick={() => setFilters({ ...filters, condition: "" })}
            >
              Any Condition
            </button>
            {conditions.map(cond => (
              <button 
                key={cond}
                className={`filter-pill ${filters.condition === cond ? "active" : ""}`}
                onClick={() => setFilters({ ...filters, condition: cond })}
              >
                {cond.charAt(0).toUpperCase() + cond.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center mt-24 text-secondary"><Loader2 className="icon" style={{ animation: 'spin 1s linear infinite' }} /> Loading listings...</div>
      ) : error ? (
        <div className="form-message error">{error}</div>
      ) : listings.length === 0 ? (
        <div className="text-center mt-24 text-secondary">No listings found.</div>
      ) : (
        <div className="listing-grid">
          {listings.map(listing => (
            <motion.div 
              key={listing.id}
              className="listing-card"
              onClick={() => setPage({ view: "detail", listingId: listing.id })}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
            >
              <div className="card-image-wrap">
                <img src={getListingVisual(listing).src} alt={listing.title} className="card-image" />
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3 className="card-title">{listing.title}</h3>
                  <div className="card-price">৳{listing.price.toLocaleString()}</div>
                </div>
                <p className="card-desc">{listing.description}</p>
                <div className="card-meta">
                  <span className="meta-pill">{listing.category}</span>
                  <span className="meta-pill">{listing.condition}</span>
                  <TrustBadge score={listing.fraud?.score ?? 0} status={listing.status} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPage({ listing, setPage, openChat, token, user, setNotice }) {
  const [reportReason, setReportReason] = useState("");
  
  async function handleReport() {
    if (!reportReason || !user) return;
    try {
      await api(`/api/listings/${listing.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reportReason })
      }, token);
      setNotice("Listing reported. Admins will review it.");
      setReportReason("");
    } catch (err) {
      setNotice(err.message);
    }
  }

  const score = listing.fraud?.score ?? 0;

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => setPage({ view: "browse", listingId: null })}>
        <ArrowLeft size={16} /> Back to listings
      </button>

      <div className="detail-image-wrap">
        <img src={getListingVisual(listing).src} alt={listing.title} className="detail-image" />
      </div>
      <div className="image-credit">Image provided by Unsplash API</div>

      <div className="detail-grid">
        <div className="detail-left">
          <h1 className="detail-title">{listing.title}</h1>
          <div className="detail-price">৳{listing.price.toLocaleString()}</div>
          
          <div className="card-meta mb-24">
            <span className="meta-pill">{listing.category}</span>
            <span className="meta-pill">{listing.condition}</span>
            <span className="meta-pill">{listing.brand || "Unbranded"}</span>
          </div>
          
          <h3 className="detail-section-title">Description</h3>
          <p className="detail-desc">{listing.description}</p>

          <div className="risk-meter-clean">
            <div className="risk-meter-header">
              <span className="detail-section-title" style={{ marginBottom: 0 }}>Trust Score: {score}/100</span>
              <TrustBadge score={score} status={listing.status} />
            </div>
            <div className="risk-bar-track">
              <div 
                className="risk-bar-fill" 
                style={{ 
                  width: `${score}%`, 
                  backgroundColor: score >= 75 ? 'var(--danger)' : score >= 45 ? 'var(--warning)' : 'var(--success)' 
                }} 
              />
            </div>
            <div className="risk-factors">
              {listing.fraud?.flags?.map((flag, idx) => (
                <div key={idx} className="risk-factor">
                  <AlertTriangle className="icon" />
                  <span>{flag}</span>
                </div>
              ))}
              {listing.fraud?.flags?.length === 0 && (
                <div className="risk-factor" style={{ color: 'var(--success)' }}>
                  <ShieldCheck className="icon" />
                  <span>No risk factors detected</span>
                </div>
              )}
            </div>
          </div>
          
          {user && listing.sellerId !== user.id && (
            <div className="mt-24">
              <h3 className="detail-section-title">Report Listing</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="form-input" 
                  placeholder="Reason for report..." 
                  value={reportReason} 
                  onChange={(e) => setReportReason(e.target.value)} 
                />
                <button className="btn btn-danger" onClick={handleReport}>Report</button>
              </div>
            </div>
          )}
        </div>

        <div className="detail-right">
          <div className="seller-card">
            <h3 className="detail-section-title">About the Seller</h3>
            <div className="seller-header">
              <div className="seller-avatar">
                {listing.seller?.name?.charAt(0)?.toUpperCase() || "S"}
              </div>
              <div>
                <div className="seller-name">{listing.seller?.name || "Unknown Seller"}</div>
                <div className="seller-rating">
                  <Star size={14} fill="currentColor" color="var(--warning)" />
                  <span>{listing.seller?.rating?.toFixed(1) || "New"}</span>
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              <button 
                className="btn btn-primary" 
                onClick={() => openChat(listing)}
                disabled={!user || listing.sellerId === user.id}
              >
                <MessageCircle size={16} /> 
                {listing.sellerId === user.id ? "Your Listing" : "Message Seller"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatePage({ token, onCreated, setNotice }) {
  const [form, setForm] = useState({ title: "", category: "phone", brand: "", condition: "good", price: "", description: "", location: defaultLocation });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let photos = [];
      if (photo) {
        const fileRes = await uploadFile("/api/uploads/listing-photo", photo, token);
        photos.push(fileRes);
      }
      await api("/api/listings", {
        method: "POST",
        body: JSON.stringify({ ...form, price: Number(form.price), photos })
      }, token);
      setNotice("Listing created and pending ML review");
      onCreated();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-container">
      <h1 className="page-title">Sell an Item</h1>
      <p className="page-subtitle">List your item securely on Radius</p>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        <div style={{ flex: 1, height: '4px', backgroundColor: step >= 1 ? 'var(--accent)' : 'var(--bg-tertiary)', borderRadius: '2px' }} />
        <div style={{ flex: 1, height: '4px', backgroundColor: step >= 2 ? 'var(--accent)' : 'var(--bg-tertiary)', borderRadius: '2px' }} />
      </div>

      <form onSubmit={submit}>
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="form-group">
              <label className="form-label">Photo</label>
              <input type="file" className="form-input" required accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. iPhone 13 Pro 256GB" />
            </div>
            <div className="form-group">
              <label className="form-label">Price (৳)</label>
              <input type="number" className="form-input" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 85000" />
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)} style={{ width: '100%' }}>Continue <ArrowRight size={16} /></button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input className="form-input" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Apple" />
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe any wear and tear..." />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}><ArrowLeft size={16} /> Back</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading ? <Loader2 className="icon" style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
                Publish Listing
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}

function SellerPage({ listings, token, reload, setNotice }) {
  async function markStatus(id, status) {
    try {
      await api(`/api/listings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token);
      setNotice(`Listing marked as ${status}`);
      reload();
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="detail-page">
      <h1 className="page-title">Manage Listings</h1>
      <p className="page-subtitle mb-32">Your active and past items on Radius</p>

      {listings.length === 0 ? (
        <div className="text-secondary">You haven't posted any listings yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Status</th>
                <th>Trust Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>৳{item.price}</td>
                  <td><span className="meta-pill">{item.status}</span></td>
                  <td><TrustBadge score={item.fraud?.score ?? 0} status={item.status} /></td>
                  <td>
                    <select 
                      className="form-input" 
                      style={{ padding: '6px 12px', width: 'auto' }}
                      value={item.status} 
                      onChange={(e) => markStatus(item.id, e.target.value)}
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChatPage({ listing, user, token, messages, setNotice }) {
  const [draft, setDraft] = useState("");

  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await api(`/api/chat/${listing.id}`, { method: "POST", body: JSON.stringify({ recipientId: listing.sellerId, body: draft }) }, token);
      setDraft("");
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="chat-layout">
      <div className="chat-sidebar">
        <div className="chat-header">About Item</div>
        <div style={{ padding: '16px' }}>
          <img src={getListingVisual(listing).src} alt="" style={{ borderRadius: 'var(--radius-md)', marginBottom: '12px' }} />
          <div style={{ fontWeight: 600 }}>{listing.title}</div>
          <div style={{ color: 'var(--blue)', fontWeight: 700, marginBottom: '12px' }}>৳{listing.price}</div>
          <TrustBadge score={listing.fraud?.score ?? 0} status={listing.status} />
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-header">
          {listing.sellerId === user.id ? "Chat with Buyer" : `Chat with ${listing.seller?.name || "Seller"}`}
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 && <div className="text-center text-secondary mt-24">No messages yet. Say hello!</div>}
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.senderId === user.id ? "sent" : "received"}`}>
              <div>{m.content}</div>
              <div className="chat-bubble-meta">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
        
        <form className="chat-input-area" onSubmit={send}>
          <input 
            className="form-input" 
            placeholder="Type a message..." 
            value={draft} 
            onChange={(e) => setDraft(e.target.value)} 
          />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminPage({ admin, token, reload, setNotice }) {
  const [tab, setTab] = useState("queue");

  async function resolveFraud(id, action) {
    try {
      await api(`/api/admin/fraud-queue/${id}/decision`, { method: "POST", body: JSON.stringify({ decision: action }) }, token);
      setNotice(`Listing ${action}d`);
      reload();
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="detail-page" style={{ maxWidth: '1200px' }}>
      <h1 className="page-title mb-32">Admin Dashboard</h1>

      {admin.stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Listings</div>
            <div className="admin-stat-value">{admin.stats.totalListings}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Active Users</div>
            <div className="admin-stat-value">{admin.stats.activeUsers}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Reported Items</div>
            <div className="admin-stat-value">{admin.stats.reportedListings}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Fraud Caught</div>
            <div className="admin-stat-value text-danger">{admin.stats.fraudCaught}</div>
          </div>
        </div>
      )}

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>Fraud Queue ({admin.queue.length})</button>
        <button className={`admin-tab ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>User Reports ({admin.reports.length})</button>
        <button className={`admin-tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users ({admin.users.length})</button>
      </div>

      <div className="admin-table-wrap">
        {tab === "queue" && (
          <table className="admin-table">
            <thead>
              <tr><th>Item</th><th>Seller</th><th>Score</th><th>Reasons</th><th>Action</th></tr>
            </thead>
            <tbody>
              {admin.queue.length === 0 && <tr><td colSpan="5" className="text-center">Queue is clean</td></tr>}
              {admin.queue.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong><br/><span className="text-secondary">৳{item.price}</span></td>
                  <td>{item.seller?.name || item.sellerId}</td>
                  <td><TrustBadge score={item.fraud?.score ?? 0} status={item.status} /></td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>
                    {item.fraud?.flags?.map(f => <div key={f}>• {f}</div>)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" onClick={() => resolveFraud(item.id, "allow")}>Allow</button>
                      <button className="btn btn-danger" onClick={() => resolveFraud(item.id, "remove")}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "reports" && (
          <table className="admin-table">
            <thead>
              <tr><th>Target</th><th>Reporter</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {admin.reports.length === 0 && <tr><td colSpan="4" className="text-center">No reports</td></tr>}
              {admin.reports.map(r => (
                <tr key={r.id}>
                  <td>{r.targetId}</td>
                  <td>{r.reporterId}</td>
                  <td>{r.reason}</td>
                  <td><span className="meta-pill">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "users" && (
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
            </thead>
            <tbody>
              {admin.users.length === 0 && <tr><td colSpan="4" className="text-center">No users</td></tr>}
              {admin.users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="meta-pill">{u.role}</span></td>
                  <td><span className="meta-pill">{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
