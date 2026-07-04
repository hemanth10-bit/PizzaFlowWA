import React, { useState, useEffect } from "react";
import { Order, PizzaBase, Pizza, Topping, ForecastResult, BusinessInsight } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ListFilter, Search, RefreshCw, CheckCircle, Flame, Clock, Trash2, Edit2, Plus, Sparkles, TrendingUp, AlertCircle, ShoppingBag, Database, ListCollapse, Play, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../lib/api";

interface AdminPortalProps {
  onStatusChange: () => void;
  orders: Order[];
  onRefreshOrders: () => void;
}

export default function AdminPortal({ onStatusChange, orders, onRefreshOrders }: AdminPortalProps) {
  // Tabs: orders, menu, analytics, ai
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "analytics" | "ai">("orders");

  // Filter orders by status or search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Menu editor states
  const [bases, setBases] = useState<PizzaBase[]>([]);
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: "base" | "pizza" | "topping"; index: number; data: any } | null>(null);
  const [addingItem, setAddingItem] = useState<{ type: "base" | "pizza" | "topping"; data: any } | null>(null);

  // AI Forecast & Insights states
  const [forecasting, setForecasting] = useState(false);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insightsResult, setInsightsResult] = useState<BusinessInsight[] | null>(null);
  const [aiError, setAiError] = useState("");

  // Fetch menu
  const fetchMenu = () => {
    setLoadingMenu(true);
    fetch(getApiUrl("/api/menu"))
      .then((res) => res.json())
      .then((data) => {
        setBases(data.bases || []);
        setPizzas(data.pizzas || []);
        setToppings(data.toppings || []);
        setLoadingMenu(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingMenu(false);
      });
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/orders/${orderId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        onRefreshOrders();
        onStatusChange();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Trigger AI Forecast
  const handleRunForecast = async () => {
    setForecasting(true);
    setAiError("");
    try {
      const response = await fetch(getApiUrl("/api/ai/forecast"), { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate forecast");
      setForecastResult(data);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setForecasting(false);
    }
  };

  // Trigger AI Insights
  const handleRunInsights = async () => {
    setGeneratingInsights(true);
    setAiError("");
    try {
      const response = await fetch(getApiUrl("/api/ai/insights"), { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate insights");
      setInsightsResult(data.insights || []);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Save menu changes back to .txt files on server
  const handleSaveMenuChanges = async (newBases = bases, newPizzas = pizzas, newToppings = toppings) => {
    try {
      const res = await fetch(getApiUrl("/api/menu/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bases: newBases, pizzas: newPizzas, toppings: newToppings }),
      });
      if (res.ok) {
        fetchMenu();
        setEditingItem(null);
        setAddingItem(null);
      } else {
        alert("Failed to save menu changes on the server.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Analytics Aggregations
  const getRevenueByDay = () => {
    const revs: { [key: string]: number } = {};
    orders
      .filter((o) => o.status === "completed")
      .forEach((o) => {
        const dateStr = new Date(o.timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
        revs[dateStr] = (revs[dateStr] || 0) + o.total;
      });
    return Object.keys(revs).map((day) => ({ day, Revenue: Math.round(revs[day]) }));
  };

  const getPizzasSold = () => {
    const counts: { [key: string]: number } = {};
    orders
      .filter((o) => o.status === "completed")
      .forEach((o) => {
        o.items.forEach((item) => {
          counts[item.pizzaName] = (counts[item.pizzaName] || 0) + item.quantity;
        });
      });
    return Object.keys(counts).map((name) => ({ name, Quantity: counts[name] }));
  };

  const getPaymentModes = () => {
    const counts: { [key: string]: number } = {};
    orders
      .filter((o) => o.status === "completed")
      .forEach((o) => {
        counts[o.paymentMode] = (counts[o.paymentMode] || 0) + o.total;
      });
    return Object.keys(counts).map((name) => ({ name, value: Math.round(counts[name]) }));
  };

  // Totals
  const totalCompletedOrders = orders.filter((o) => o.status === "completed").length;
  const totalRevenue = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = totalCompletedOrders > 0 ? Math.round(totalRevenue / totalCompletedOrders) : 0;

  const COLORS = ["#ef4444", "#f97316", "#3b82f6", "#10b981", "#8b5cf6"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4" id="admin-portal-root">
      {/* Overview stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="admin-summary-stats">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xs font-bold text-slate-400 font-mono uppercase">TOTAL SALES</p>
            <h4 className="text-xl font-black text-slate-800 font-mono font-display">₹{Math.round(totalRevenue).toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xs font-bold text-slate-400 font-mono uppercase">ORDERS BAKED</p>
            <h4 className="text-xl font-black text-slate-800 font-mono font-display">{totalCompletedOrders}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xs font-bold text-slate-400 font-mono uppercase">AVG BASKET SIZE</p>
            <h4 className="text-xl font-black text-slate-800 font-mono font-display">₹{avgOrderValue}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xs font-bold text-slate-400 font-mono uppercase">ACTIVE ORDERS</p>
            <h4 className="text-xl font-black text-slate-800 font-mono font-display">
              {orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length}
            </h4>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit" id="admin-tabs">
        {[
          { id: "orders", label: "Active Kitchen Queue" },
          { id: "menu", label: "Menu Catalog Manager" },
          { id: "analytics", label: "Interactive Analytics" },
          { id: "ai", label: "AI Intelligence Hub" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-950"
            }`}
            id={`tab-admin-${tab.id}`}
          >
            {tab.id === "ai" && <Sparkles className="w-4 h-4 text-indigo-600 inline mr-1.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: ACTIVE KITCHEN QUEUE */}
        {activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search order ID, customer name or phone..."
                  className="w-full bg-slate-50 text-xs p-2.5 pl-9 rounded-xl outline-none border border-slate-200 focus:border-indigo-500 focus:bg-white"
                  id="admin-order-search"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold p-2.5 rounded-xl outline-none"
                  id="admin-status-filter"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Verification</option>
                  <option value="preparing">In the Oven</option>
                  <option value="ready">Ready at Counter</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  onClick={onRefreshOrders}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors cursor-pointer"
                  title="Reload Queue"
                  id="btn-admin-reload-orders"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Orders list */}
            <div className="space-y-4" id="admin-orders-list">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No matches found in the kitchen logs</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded-lg">
                          {order.id}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(order.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>

                        {/* Status badge */}
                        <span
                          className={`text-3xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            order.status === "pending"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : order.status === "preparing"
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                              : order.status === "ready"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : order.status === "completed"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="text-xs">
                        <p className="text-slate-800 font-bold">
                          {order.customerName} <span className="text-slate-400 font-normal">({order.customerPhone})</span>
                        </p>
                        <div className="space-y-1.5 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/40">
                          {order.items.map((it, idx) => (
                            <p key={idx} className="text-slate-700">
                              <strong className="text-slate-900">{it.quantity}x</strong> {it.pizzaName} ({it.size}) -{" "}
                              <span className="text-3xs text-slate-500 font-mono">
                                Crust: {it.baseName}
                                {it.toppings.length > 0 && ` | Toppings: ${it.toppings.join(", ")}`}
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                      <div className="text-left md:text-right">
                        <span className="text-3xs text-slate-400 font-mono block">TOTAL INVOICE (POST TAX)</span>
                        <span className="text-lg font-black text-slate-900 font-mono">₹{order.total}</span>
                        <span className="text-4xs text-slate-400 block font-mono">Paid via {order.paymentMode}</span>
                      </div>

                      {/* Status Transition buttons */}
                      <div className="flex gap-1">
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "preparing")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-3xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                            id={`btn-queue-bake-${order.id}`}
                          >
                            <Flame className="w-3.5 h-3.5" /> Start Baking
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "ready")}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-3xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                            id={`btn-queue-ready-${order.id}`}
                          >
                            <Clock className="w-3.5 h-3.5" /> Set Ready
                          </button>
                        )}
                        {order.status === "ready" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "completed")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-3xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                            id={`btn-queue-complete-${order.id}`}
                          >
                            <Check className="w-3.5 h-3.5" /> Dispatch
                          </button>
                        )}
                        {order.status !== "completed" && order.status !== "cancelled" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "cancelled")}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-3xs py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                            id={`btn-queue-cancel-${order.id}`}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: MENU CATALOG MANAGER (CRUD) */}
        {activeTab === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold font-display text-slate-900">Runtime Menu CRUD Editor</h3>
                  <p className="text-xs text-slate-500 mt-1">Changes are saved back directly into the bases.txt, pizzas.txt, and toppings.txt files.</p>
                </div>
                <button onClick={fetchMenu} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Bases catalog */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">1. Crust Bases</h4>
                  <button
                    onClick={() => setAddingItem({ type: "base", data: { name: "", price: 100, description: "" } })}
                    className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-1.5 px-3 rounded-xl transition-colors cursor-pointer border border-indigo-100/30"
                    id="btn-add-crust"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Crust
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-400 font-mono text-3xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold">Crust Name</th>
                        <th className="p-3 font-semibold">Price (₹)</th>
                        <th className="p-3 font-semibold">Description</th>
                        <th className="p-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bases.map((base, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">{base.name}</td>
                          <td className="p-3 font-mono font-semibold">₹{base.price}</td>
                          <td className="p-3 text-slate-500">{base.description}</td>
                          <td className="p-3 text-right">
                            <button
                               onClick={() => {
                                 const newBases = bases.filter((_, i) => i !== idx);
                                 setBases(newBases);
                                 handleSaveMenuChanges(newBases, pizzas, toppings);
                               }}
                               className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                               title="Delete crust"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pizzas Templates catalog */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">2. Pizza Templates</h4>
                  <button
                    onClick={() => setAddingItem({ type: "pizza", data: { name: "", price: 250, description: "", category: "Veg" } })}
                    className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-1.5 px-3 rounded-xl transition-colors cursor-pointer border border-indigo-100/30"
                    id="btn-add-pizza-template"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Pizza
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-400 font-mono text-3xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold">Pizza Name</th>
                        <th className="p-3 font-semibold">Category</th>
                        <th className="p-3 font-semibold">Base Price (₹)</th>
                        <th className="p-3 font-semibold">Ingredients Description</th>
                        <th className="p-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pizzas.map((pizza, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">{pizza.name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                                pizza.category === "Veg" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {pizza.category}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-semibold">₹{pizza.price}</td>
                          <td className="p-3 text-slate-500">{pizza.description}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                const newPizzas = pizzas.filter((_, i) => i !== idx);
                                setPizzas(newPizzas);
                                handleSaveMenuChanges(bases, newPizzas, toppings);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete pizza"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Toppings catalog */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">3. Custom Toppings</h4>
                  <button
                    onClick={() => setAddingItem({ type: "topping", data: { name: "", price: 40, category: "Veg" } })}
                    className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-1.5 px-3 rounded-xl transition-colors cursor-pointer border border-indigo-100/30"
                    id="btn-add-topping-item"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Topping
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-400 font-mono text-3xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold">Topping Name</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Topping Price (₹)</th>
                        <th className="p-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toppings.map((topping, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">{topping.name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                                topping.category === "Veg" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {topping.category}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-semibold">₹{topping.price}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                const newToppings = toppings.filter((_, i) => i !== idx);
                                setToppings(newToppings);
                                handleSaveMenuChanges(bases, pizzas, newToppings);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete topping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal/Form for Adding menu items */}
            {addingItem && (
              <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
                  <h3 className="font-extrabold text-lg text-slate-900 font-display">Add New {addingItem.type.toUpperCase()}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Item Name</label>
                      <input
                        type="text"
                        value={addingItem.data.name}
                        onChange={(e) => setAddingItem({ ...addingItem, data: { ...addingItem.data, name: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                        placeholder="e.g. Garlic Butter Crust"
                      />
                    </div>

                    <div>
                      <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Price (INR)</label>
                      <input
                        type="number"
                        value={addingItem.data.price}
                        onChange={(e) => setAddingItem({ ...addingItem, data: { ...addingItem.data, price: parseFloat(e.target.value) } })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    {addingItem.type !== "topping" && (
                      <div>
                        <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Description</label>
                        <textarea
                          value={addingItem.data.description}
                           onChange={(e) => setAddingItem({ ...addingItem, data: { ...addingItem.data, description: e.target.value } })}
                          className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none focus:bg-white focus:border-indigo-500 h-16 resize-none"
                          placeholder="Short description"
                        />
                      </div>
                    )}

                    {addingItem.type !== "base" && (
                      <div>
                        <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Food Category</label>
                        <select
                          value={addingItem.data.category}
                          onChange={(e) => setAddingItem({ ...addingItem, data: { ...addingItem.data, category: e.target.value } })}
                          className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-xl outline-none"
                        >
                          <option value="Veg">Veg</option>
                          <option value="Non-Veg">Non-Veg</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddingItem(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!addingItem.data.name.trim()) return alert("Name is required");
                        if (addingItem.type === "base") {
                          const updated = [...bases, addingItem.data];
                          setBases(updated);
                          handleSaveMenuChanges(updated, pizzas, toppings);
                        } else if (addingItem.type === "pizza") {
                          const updated = [...pizzas, addingItem.data];
                          setPizzas(updated);
                          handleSaveMenuChanges(bases, updated, toppings);
                        } else {
                          const updated = [...toppings, addingItem.data];
                          setToppings(updated);
                          handleSaveMenuChanges(bases, pizzas, updated);
                        }
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Save Item
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: ANALYTICS DASHBOARDS */}
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Revenue Trend chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider">REVENUE TRENDS OVER TIME</h3>
              <div className="h-64">
                {getRevenueByDay().length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    No completed orders available to display revenue trend.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getRevenueByDay()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`₹${value}`, "Revenue"]} />
                      <Line type="monotone" dataKey="Revenue" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pizza Sales Breakdown & Payment methods split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pizza Sales volume */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider">PIZZAS POPULARITY (VOL)</h3>
                <div className="h-64">
                  {getPizzasSold().length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      No pizzas sold yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPizzasSold()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="Quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Payment Split share */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider">PAYMENT MODE VALUE SPLIT</h3>
                </div>
                <div className="h-48 relative flex items-center justify-center">
                  {getPaymentModes().length === 0 ? (
                    <div className="text-gray-400 text-xs">No transaction history.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPaymentModes()}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getPaymentModes().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                 <div className="flex justify-center gap-4 text-3xs font-mono text-slate-500 pt-4 border-t border-slate-100">
                  {getPaymentModes().map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span>
                        {item.name} (₹{item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: AI INTELLIGENCE HUB */}
        {activeTab === "ai" && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* AI Control triggers */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
                  AI Intelligence Hub (Gemini 3.5-Flash)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Predict demand, calculate purchase estimates, and produce plain-language sales insights.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRunInsights}
                  disabled={generatingInsights}
                  className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold text-xs py-3 px-5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
                  id="btn-run-insights"
                >
                  {generatingInsights ? (
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <ListCollapse className="w-4 h-4 text-slate-500" /> Analyze Insights
                    </>
                  )}
                </button>

                <button
                  onClick={handleRunForecast}
                  disabled={forecasting}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 px-5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
                  id="btn-run-forecast"
                >
                  {forecasting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-white" /> Run AI Demand Forecast
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiError && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* AI Results grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Plain language Insights summary */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider border-b border-slate-100 pb-3">
                  PLAIN-LANGUAGE BUSINESS INSIGHTS
                </h4>

                {insightsResult ? (
                  <div className="space-y-4">
                    {insightsResult.map((insight, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100/50 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-sm text-slate-900 font-display">{insight.title}</span>
                          <span className="bg-indigo-50 text-indigo-600 font-mono text-3xs font-extrabold px-2 py-0.5 rounded-md">
                            {insight.metric}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-xs flex flex-col items-center">
                    <ListCollapse className="w-8 h-8 opacity-25 mb-2" />
                    <p className="font-semibold">No insights calculated yet.</p>
                    <p className="text-4xs mt-1">Click "Analyze Insights" to call Gemini and check performance trends.</p>
                  </div>
                )}
              </div>

              {/* Advanced forecasting and recommendations */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider border-b border-slate-100 pb-3">
                    DEMAND ESTIMATOR & REPLENISHMENT ADVICE
                  </h4>
                </div>

                {forecastResult ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs leading-relaxed text-indigo-950">
                      <p className="font-bold flex items-center gap-1.5 text-indigo-900 mb-1">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        AI Summary
                      </p>
                      {forecastResult.summary}
                    </div>

                    {/* Inventory suggestions */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-slate-400 font-mono uppercase">RECOMMENDED STOCK INTAKE</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {forecastResult.recommendedInventoryPurchases.map((rec, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-800">{rec.ingredient}</span>
                              <span
                                className={`text-4xs font-extrabold px-1.5 py-0.5 rounded-md ${
                                  rec.priority === "High"
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : rec.priority === "Medium"
                                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-4xs text-slate-400 leading-tight">{rec.reason}</p>
                            <div className="flex items-center gap-1 pt-1">
                              <span className="text-3xs font-semibold text-slate-500">Suggested:</span>
                              <span className="text-3xs font-bold text-emerald-600">+{rec.suggestedIncreasePercentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Peak periods and volumes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-400 font-mono uppercase">ESTIMATED BUSTLE TIMES</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">{forecastResult.peakHoursForecast}</p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-400 font-mono uppercase">PIZZA VOLUME TRAJECTORY</h5>
                        <div className="space-y-2">
                          {forecastResult.pizzasDemandForecast.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-slate-700 font-medium">{p.name}</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="font-bold text-slate-900">{p.predictedVolumeNextWeek} units</span>
                                <span
                                  className={`text-4xs font-bold ${
                                    p.trend === "up" ? "text-emerald-600" : p.trend === "down" ? "text-rose-500" : "text-slate-400"
                                  }`}
                                >
                                  {p.trend === "up" ? "▲ UP" : p.trend === "down" ? "▼ DOWN" : "■ STABLE"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center">
                    <Database className="w-10 h-10 opacity-20 mb-3" />
                    <p className="font-semibold">AI demand matrix is unloaded.</p>
                    <p className="text-4xs mt-1">Press "Run AI Demand Forecast" to calculate replenishment volumes.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
