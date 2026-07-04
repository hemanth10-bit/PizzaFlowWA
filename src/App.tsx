import React, { useState, useEffect } from "react";
import CustomerPortal from "./components/CustomerPortal";
import AdminPortal from "./components/AdminPortal";
import OrderStatusTracker from "./components/OrderStatusTracker";
import { Order } from "./types";
import { Pizza, ShieldAlert, Sparkles, ShoppingBag, Eye, User, Clock, Heart, ChefHat, Lock, Unlock, LogOut, Key, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "./lib/api";

export default function App() {
  // Navigation: customer vs admin
  const [viewMode, setViewMode] = useState<"customer" | "admin">("customer");

  // Check if admin credentials have been set in localStorage
  const [hasAdminCredentials, setHasAdminCredentials] = useState<boolean>(() => {
    return !!localStorage.getItem("staff_admin_email") && !!localStorage.getItem("staff_admin_password");
  });

  // Setup / Registration state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupError, setSetupError] = useState("");

  // Staff Authentication state
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("staff_auth") === "true";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showTracker, setShowTracker] = useState(false);

  // Load all orders
  const refreshOrders = () => {
    fetch(getApiUrl("/api/orders"))
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setOrders(data);
        // If we have an active order, find its latest status in the updated list
        if (activeOrder) {
          const latest = data.find((o: Order) => o.id === activeOrder.id);
          if (latest) {
            setActiveOrder(latest);
          }
        }
      })
      .catch((err) => console.error("Error loading orders", err));
  };

  useEffect(() => {
    refreshOrders();
    // Auto-poll orders queue every 5 seconds for real-time customer status updates!
    const interval = setInterval(refreshOrders, 5000);
    return () => clearInterval(interval);
  }, [activeOrder?.id]);

  // Handle order checkout completion
  const handleOrderPlaced = (newOrder: Order) => {
    setActiveOrder(newOrder);
    setShowTracker(true);
    refreshOrders();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-950 selection:bg-indigo-600 selection:text-white" id="slicematic-app-root">
      {/* Top Brand Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-100"
              animate={{ scale: [1, 1.02, 0.98, 1] }}
              transition={{ repeat: Infinity, duration: 6 }}
            >
              <Pizza className="w-6 h-6" />
            </motion.div>
            <div>
              <h1 className="text-xl font-black font-display tracking-tight text-slate-900 leading-none">
                SliceMatic
              </h1>
              <span className="text-3xs font-bold text-slate-400 font-mono tracking-wide uppercase">Pristine Pizzas & Intelligent Kitchens</span>
            </div>
          </div>

          {/* Nav switcher (Customer Portal vs Staff Panel) */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("customer")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "customer"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-950"
                }`}
                id="btn-nav-customer"
              >
                <User className="w-3.5 h-3.5" />
                Customer Menu
              </button>

              <button
                onClick={() => setViewMode("admin")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "admin"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-950"
                }`}
                id="btn-nav-admin"
              >
                <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
                Staff Portal
              </button>
            </div>

            {viewMode === "admin" && isStaffAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to reset your credentials? This will log you out, clear all saved logins, and prompt you to set new admin credentials immediately.")) {
                      localStorage.removeItem("staff_admin_email");
                      localStorage.removeItem("staff_admin_password");
                      sessionStorage.removeItem("staff_auth");
                      
                      // Fully reset input states
                      setNewEmail("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setEmail("");
                      setPassword("");
                      setLoginError("");
                      setSetupError("");
                      
                      setHasAdminCredentials(false);
                      setIsStaffAuthenticated(false);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl border border-slate-200 transition-all cursor-pointer"
                  id="btn-nav-reset-password"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-600" />
                  Reset Password
                </button>

                <button
                  onClick={() => {
                    sessionStorage.removeItem("staff_auth");
                    setIsStaffAuthenticated(false);
                  }}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs py-2 px-3 rounded-xl border border-rose-100 transition-all cursor-pointer"
                  id="btn-nav-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 py-8">
        <AnimatePresence mode="wait">
          {viewMode === "customer" ? (
            <motion.div
              key="customer-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CustomerPortal
                onOrderPlaced={handleOrderPlaced}
                activeOrder={activeOrder}
                onViewTracker={() => setShowTracker(true)}
              />
            </motion.div>
          ) : !hasAdminCredentials ? (
            <motion.div
              key="staff-setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
              id="staff-setup-panel"
            >
              <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-8 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_60%)]"></div>
                <div className="relative z-10">
                  <div className="mx-auto w-12 h-12 bg-indigo-600/30 border border-indigo-500/50 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
                    <Key className="w-5.5 h-5.5 animate-bounce" />
                  </div>
                  <h2 className="text-2xl font-black font-display tracking-tight leading-none">Set Admin Credentials</h2>
                  <p className="text-slate-400 text-2xs mt-2 uppercase tracking-widest font-mono">First-Time Setup</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleanEmail = newEmail.trim();
                  const cleanPass = newPassword;
                  if (!cleanEmail.includes("@") || cleanEmail.length < 5) {
                    setSetupError("Please enter a valid email address.");
                    return;
                  }
                  if (cleanPass.length < 5) {
                    setSetupError("Password must be at least 5 characters.");
                    return;
                  }
                  if (cleanPass !== confirmPassword) {
                    setSetupError("Passwords do not match.");
                    return;
                  }

                  localStorage.setItem("staff_admin_email", cleanEmail);
                  localStorage.setItem("staff_admin_password", cleanPass);
                  sessionStorage.setItem("staff_auth", "true");
                  
                  setHasAdminCredentials(true);
                  setIsStaffAuthenticated(true);
                  setSetupError("");
                  setNewEmail("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="p-8 space-y-4"
              >
                {setupError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2.5"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{setupError}</span>
                  </motion.div>
                )}

                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-1">
                  Please configure your administrative credentials. These will be saved locally in your browser for all future visits.
                </p>

                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Set Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@pizza.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-semibold text-xs p-3.5 rounded-xl transition-all outline-none"
                    id="setup-email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Set Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 5 characters"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-semibold text-xs p-3.5 rounded-xl transition-all outline-none"
                    id="setup-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-semibold text-xs p-3.5 rounded-xl transition-all outline-none"
                    id="setup-confirm-password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-4 px-6 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-4 flex items-center justify-center gap-2"
                  id="btn-setup-submit"
                >
                  <Unlock className="w-4 h-4" />
                  Save & Authorize Access
                </button>
              </form>
            </motion.div>
          ) : !isStaffAuthenticated ? (
            <motion.div
              key="staff-login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
              id="staff-login-panel"
            >
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_60%)]"></div>
                <div className="relative z-10">
                  <div className="mx-auto w-12 h-12 bg-indigo-600/30 border border-indigo-500/50 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
                    <Lock className="w-5.5 h-5.5 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-black font-display tracking-tight leading-none">Kitchen HQ Portal</h2>
                  <p className="text-slate-400 text-2xs mt-2 uppercase tracking-widest font-mono">STAFF & ADMIN ONLY</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const savedEmail = localStorage.getItem("staff_admin_email") || "";
                  const savedPass = localStorage.getItem("staff_admin_password") || "";

                  if (email.trim().toLowerCase() === savedEmail.toLowerCase() && password === savedPass) {
                    sessionStorage.setItem("staff_auth", "true");
                    setIsStaffAuthenticated(true);
                    setLoginError("");
                    setPassword("");
                  } else {
                    setLoginError("Invalid email or password. Please try again.");
                  }
                }}
                className="p-8 space-y-5"
              >
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2.5"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your custom email"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-semibold text-xs p-3.5 rounded-xl transition-all outline-none"
                    id="login-email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-semibold text-xs p-3.5 rounded-xl transition-all outline-none"
                    id="login-password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-4 px-6 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2"
                  id="btn-login-submit"
                >
                  Authorize Access
                </button>

                <div className="pt-4 border-t border-slate-100 text-center flex flex-col items-center gap-2">
                  <p className="text-3xs text-slate-400 font-medium">
                    Forgot credentials or want to change them?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to reset your credentials? This will wipe your saved email and password, and you will need to set them again.")) {
                        localStorage.removeItem("staff_admin_email");
                        localStorage.removeItem("staff_admin_password");
                        sessionStorage.removeItem("staff_auth");
                        
                        // Fully reset states
                        setNewEmail("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setEmail("");
                        setPassword("");
                        setLoginError("");
                        setSetupError("");
                        
                        setHasAdminCredentials(false);
                        setIsStaffAuthenticated(false);
                      }
                    }}
                    className="text-3xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    id="btn-reset-auth"
                  >
                    Reset & Set New Credentials
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AdminPortal
                onStatusChange={refreshOrders}
                orders={orders}
                onRefreshOrders={refreshOrders}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Slide-out/Focused Modal for Active Customer Tracker */}
      <AnimatePresence>
        {showTracker && activeOrder && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="max-w-lg w-full">
              <OrderStatusTracker
                order={activeOrder}
                onRefresh={refreshOrders}
                onClose={() => setShowTracker(false)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p className="font-medium font-display text-slate-500">
            SliceMatic © 2026. Made with love for pristine Italian cuisine.
          </p>
          <div className="flex gap-4 font-mono">
            <span>GSTIN: 18% Standard</span>
            <span>Kitchen status: Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
