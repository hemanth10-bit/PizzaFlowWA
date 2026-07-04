import React, { useState, useEffect } from "react";
import { PizzaBase, Pizza, Topping, OrderItem, Order } from "../types";
import { ShoppingBag, ChevronRight, Plus, Minus, Trash2, Check, Sparkles, Phone, User, DollarSign, ArrowRight, Pizza as PizzaIcon, CheckCircle, Flame, Leaf, Circle, Layers, CircleDot, Box, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../lib/api";

const PIZZA_IMAGES: Record<string, string> = {
  "Margherita": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80",
  "Chicago Deep Dish": "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80",
  "Greek Mediterranean": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
  "California Veggie": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
  "Farm House": "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=600&q=80",
  "Pepperoni Classic": "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80",
  "BBQ Chicken": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
  "Paneer Tikka": "/Paneer-Pizza-7.jpg"
};

const getPizzaImage = (name: string): string => {
  return PIZZA_IMAGES[name] || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80";
};

const getToppingIcon = (name: string) => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes("cheese")) return <Layers className="w-4 h-4 text-amber-500 shrink-0" />;
  if (lowercaseName.includes("olive")) return <Circle className="w-4 h-4 text-slate-800 fill-slate-800 shrink-0" />;
  if (lowercaseName.includes("mushroom")) return <CircleDot className="w-4 h-4 text-amber-700 shrink-0" />;
  if (lowercaseName.includes("pepper") || lowercaseName.includes("jalapeno") || lowercaseName.includes("peri-peri")) {
    return <Flame className="w-4 h-4 text-rose-500 shrink-0" />;
  }
  if (lowercaseName.includes("tomato") || lowercaseName.includes("onion")) {
    return <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (lowercaseName.includes("corn")) return <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />;
  if (lowercaseName.includes("paneer") || lowercaseName.includes("chicken") || lowercaseName.includes("pepperoni") || lowercaseName.includes("garlic")) {
    return <Box className="w-4 h-4 text-orange-600 shrink-0" />;
  }
  return <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />;
};

const TOPPING_COORDINATES = [
  { top: "25%", left: "30%" },
  { top: "30%", left: "65%" },
  { top: "45%", left: "20%" },
  { top: "48%", left: "48%" },
  { top: "40%", left: "75%" },
  { top: "65%", left: "35%" },
  { top: "68%", left: "60%" },
  { top: "20%", left: "48%" },
];

interface CustomerPortalProps {
  onOrderPlaced: (order: Order) => void;
  activeOrder: Order | null;
  onViewTracker: () => void;
}

export default function CustomerPortal({ onOrderPlaced, activeOrder, onViewTracker }: CustomerPortalProps) {
  // Menu loaded from backend
  const [bases, setBases] = useState<PizzaBase[]>([]);
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState("");

  // Current Customizer Item State
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedBase, setSelectedBase] = useState<PizzaBase | null>(null);
  const [selectedSize, setSelectedSize] = useState<"Small" | "Medium" | "Large">("Medium");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [customizerQty, setCustomizerQty] = useState(1);

  // Cart state
  const [cart, setCart] = useState<{ id: string; item: OrderItem }[]>([]);

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Card" | "UPI">("UPI");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; general?: string }>({});

  // Tab: Browse vs. Customizer
  const [activeView, setActiveView] = useState<"browse" | "customizer">("browse");

  // Fetch Menu from Express Server
  useEffect(() => {
    fetch(getApiUrl("/api/menu"))
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load menu");
        return res.json();
      })
      .then((data) => {
        setBases(data.bases);
        setPizzas(data.pizzas);
        setToppings(data.toppings);
        // Default select first pizza and base for customizer
        if (data.pizzas.length > 0) setSelectedPizza(data.pizzas[0]);
        if (data.bases.length > 0) setSelectedBase(data.bases[0]);
        setLoadingMenu(false);
      })
      .catch((err) => {
        setMenuError("Could not load the sizzling menu. Please check that the server is active.");
        setLoadingMenu(false);
      });
  }, []);

  // Handle switching to customizer with a selected pizza template
  const handleStartCustomize = (pizza: Pizza) => {
    setSelectedPizza(pizza);
    // Keep base or default to first
    if (bases.length > 0 && !selectedBase) setSelectedBase(bases[0]);
    setSelectedToppings([]);
    setCustomizerQty(1);
    setSelectedSize("Medium");
    setActiveView("customizer");
  };

  // Toggle Toppings with a limit of 5
  const handleToggleTopping = (toppingName: string) => {
    if (selectedPizza?.name === "Margherita") {
      alert("Classic Margherita comes with tomato sauce, mozzarella, and basil. No extra toppings can be added!");
      return;
    }
    if (selectedToppings.includes(toppingName)) {
      setSelectedToppings(selectedToppings.filter((t) => t !== toppingName));
    } else {
      if (selectedToppings.length >= 5) {
        alert("Maximum of 5 toppings allowed for optimal baking quality!");
        return;
      }
      setSelectedToppings([...selectedToppings, toppingName]);
    }
  };

  // Calculate price of the currently customized pizza
  const calculateCustomizerPrice = () => {
    if (!selectedPizza || !selectedBase) return 0;
    let sizeMultiplier = 1.0;
    if (selectedSize === "Medium") sizeMultiplier = 1.2;
    else if (selectedSize === "Large") sizeMultiplier = 1.5;

    const pizzaBaseCombined = (selectedPizza.price + selectedBase.price) * sizeMultiplier;
    const toppingsPrice = selectedToppings.reduce((total, toppingName) => {
      const t = toppings.find((topping) => topping.name === toppingName);
      return total + (t ? t.price : 0);
    }, 0);

    return Math.round(pizzaBaseCombined + toppingsPrice);
  };

  // Add customized item to shopping cart
  const handleAddToCart = () => {
    if (!selectedPizza || !selectedBase) return;

    const price = calculateCustomizerPrice();
    const item: OrderItem = {
      pizzaName: selectedPizza.name,
      baseName: selectedBase.name,
      size: selectedSize,
      toppings: [...selectedToppings],
      quantity: customizerQty,
      price,
    };

    setCart([...cart, { id: Date.now().toString(), item }]);
    // Reset view
    setActiveView("browse");
    // Show feedback
  };

  // Remove from cart
  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  // Calculate running invoice totals
  const getInvoiceTotals = () => {
    const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.item.quantity, 0);
    const totalPizzas = cart.reduce((sum, c) => sum + c.item.quantity, 0);
    const discount = totalPizzas >= 5 ? Math.round(subtotal * 0.1) : 0;
    const postDiscountTotal = subtotal - discount;
    const gst = Math.round(postDiscountTotal * 0.18 * 10) / 10;
    const total = Math.round((postDiscountTotal + gst) * 10) / 10;

    return { subtotal, discount, gst, total, totalPizzas };
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: { name?: string; phone?: string } = {};

    // Name check: 2-40 letters and spaces only
    if (!customerName.trim()) {
      errors.name = "Name is required.";
    } else if (!/^[A-Za-z\s]{2,40}$/.test(customerName.trim())) {
      errors.name = "Name must be 2-40 characters, using only letters and spaces.";
    }

    // Phone check: 10 digits starting with 6/7/8/9
    if (!customerPhone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^[6-9]\d{9}$/.test(customerPhone.trim())) {
      errors.phone = "Must be a 10-digit number starting with 6, 7, 8, or 9.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (cart.length === 0) {
      setFormErrors({ ...formErrors, general: "Your cart is empty. Build a pizza first!" });
      return;
    }

    setSubmittingOrder(true);
    try {
      const response = await fetch(getApiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          paymentMode,
          items: cart.map((c) => c.item),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // Success: notify parent, reset cart and form
      onOrderPlaced(data);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setFormErrors({});
    } catch (err: any) {
      setFormErrors({ ...formErrors, general: err.message });
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loadingMenu) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold font-display text-slate-700">Warming up the ovens...</p>
      </div>
    );
  }

  if (menuError) {
    return (
      <div className="max-w-md mx-auto my-12 bg-rose-50 p-6 rounded-2xl border border-rose-100 text-center">
        <p className="text-rose-700 font-medium mb-3">{menuError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { subtotal, discount, gst, total, totalPizzas } = getInvoiceTotals();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto px-4" id="customer-portal-root">
      {/* Left Column: Menu Browsing or Customizer */}
      <div className="lg:col-span-8 space-y-6">
        {/* Banner with Active Order Tracker Shortcut */}
        {activeOrder && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                <CheckCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900 font-display">You have an active order: {activeOrder.id}</p>
                <p className="text-xs text-emerald-700">Status: {activeOrder.status.toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onViewTracker}
              className="flex items-center gap-1.5 bg-indigo-600 text-white font-semibold text-xs py-2 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
              id="btn-view-tracker"
            >
              Track Order <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Toggle (Browse vs Customizer) */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit" id="view-toggle-tabs">
          <button
            onClick={() => {
              setActiveView("browse");
              // default customize option
              if (pizzas.length > 0) setSelectedPizza(pizzas[0]);
            }}
            className={`font-semibold text-sm px-5 py-2.5 rounded-xl transition-all ${
              activeView === "browse" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-950"
            }`}
            id="tab-browse-menu"
          >
            Digital Menu
          </button>
          <button
            onClick={() => setActiveView("customizer")}
            className={`font-semibold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeView === "customizer" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-950"
            }`}
            id="tab-pizza-builder"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Pizza Builder
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeView === "browse" ? (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <h2 className="text-3xl font-extrabold font-display tracking-tight text-slate-900">Choose Your Sizzle</h2>
                <p className="text-slate-500 text-sm mt-1">Browse Rajan's crafted selections, or start customizing any pizza below.</p>
              </div>

              {/* Pizza Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="pizza-cards-grid">
                {pizzas.map((pizza) => (
                  <motion.div
                    key={pizza.name}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                    whileHover={{ y: -4 }}
                  >
                    {/* Pizza Image Banner */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                      <img
                        src={getPizzaImage(pizza.name)}
                        alt={pizza.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute top-3 right-3">
                        <span
                          className={`text-2xs font-extrabold px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm ${
                            pizza.category === "Veg"
                              ? "bg-emerald-500/90 text-white"
                              : "bg-slate-800/90 text-white"
                          }`}
                        >
                          {pizza.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="font-extrabold text-lg text-slate-900 font-display leading-tight">{pizza.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[32px]">
                          {pizza.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div>
                          <span className="text-3xs font-bold text-slate-400 block font-mono uppercase tracking-wider">BASE PRICE</span>
                          <span className="text-lg font-black text-slate-900 font-mono">₹{pizza.price}</span>
                        </div>

                        <button
                          onClick={() => handleStartCustomize(pizza)}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                          id={`btn-customize-${pizza.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          Customize <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="customizer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6"
              id="pizza-customizer-panel"
            >
              {/* Customizer Header */}
              <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-extrabold font-display text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
                    Interactive Pizza Customizer
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Design your masterclass combo. Real-time validated rules applied.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs px-3 py-1.5 rounded-xl">
                  Max 5 Custom Toppings
                </div>
              </div>

              {/* Grid split: Left Column: Visual Pizza Canvas, Right Column: Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Left Column: Interactive Animated Pizza Canvas */}
                <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/60 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[380px] relative overflow-hidden shadow-inner">
                  {/* Heat Steam animations */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center gap-6 pointer-events-none opacity-40">
                    <motion.div 
                      className="w-1.5 h-12 bg-orange-200/50 rounded-full blur-xs"
                      animate={{ y: [0, -25, 0], opacity: [0.1, 0.7, 0.1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    />
                    <motion.div 
                      className="w-1 h-14 bg-amber-100/40 rounded-full blur-xs"
                      animate={{ y: [0, -35, 0], opacity: [0.1, 0.5, 0.1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.7 }}
                    />
                    <motion.div 
                      className="w-2 h-10 bg-amber-200/30 rounded-full blur-xs"
                      animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 1.4 }}
                    />
                  </div>

                  <div className="text-center">
                    <span className="text-3xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                      Baking Canvas
                    </span>
                    <h4 className="text-sm font-black text-slate-800 mt-2 font-display">
                      {selectedPizza?.name || "Custom Build"}
                    </h4>
                    <p className="text-4xs text-slate-400 mt-0.5 uppercase tracking-widest font-mono">
                      Crust: {selectedBase?.name} ({selectedSize})
                    </p>
                  </div>

                  {/* Circular Pizza with Framer Motion Rotation */}
                  <div className="relative my-4 flex items-center justify-center">
                    <motion.div
                      className="relative rounded-full flex items-center justify-center transition-all duration-300 shadow-md"
                      style={{
                        width: selectedSize === "Small" ? "170px" : selectedSize === "Medium" ? "200px" : "230px",
                        height: selectedSize === "Small" ? "170px" : selectedSize === "Medium" ? "200px" : "230px",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 55, ease: "linear" }}
                    >
                      {/* Baked Pizza Crust outer ring */}
                      <div 
                        className={`absolute inset-0 rounded-full transition-all duration-300 border-amber-600 shadow-lg ${
                          selectedBase?.name.includes("Cheese Burst")
                            ? "bg-amber-100 border-[16px] ring-4 ring-amber-400/20"
                            : selectedBase?.name.includes("Thin Crust")
                            ? "bg-amber-100 border-[8px] border-amber-700"
                            : selectedBase?.name.includes("Thick Crust")
                            ? "bg-amber-50 border-[20px] border-amber-500 ring-2 ring-amber-600/15"
                            : selectedBase?.name.includes("Whole Wheat")
                            ? "bg-amber-100 border-[14px] border-amber-800"
                            : "bg-amber-100 border-[14px]"
                        }`}
                      >
                        {/* Pizza Sauce & Melted Cheese Inner Base */}
                        <div className="absolute inset-1.5 bg-red-600 rounded-full overflow-hidden flex items-center justify-center">
                          {/* Creamy cheesy radial background */}
                          <div className="absolute inset-1 bg-[radial-gradient(circle_at_center,#fef08a_25%,#eab308_85%)] rounded-full opacity-95 shadow-inner">
                            {/* Toasted brown cheese spots */}
                            <div className="absolute top-4 left-6 w-3 h-2 bg-amber-800/30 rounded-full blur-[1px]" />
                            <div className="absolute bottom-8 right-12 w-4 h-3 bg-amber-800/40 rounded-full blur-[1px]" />
                            <div className="absolute top-12 right-6 w-2 h-2 bg-amber-900/30 rounded-full blur-[1px]" />
                            <div className="absolute bottom-12 left-8 w-3.5 h-2.5 bg-amber-800/30 rounded-full blur-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* Default recipe toppings */}
                      {selectedPizza?.name === "Margherita" && (
                        <>
                          {/* Tomato sauce details, basil leaves, mozzarella spots */}
                          <div className="absolute top-8 left-10 w-4 h-5 bg-emerald-600 rounded-tr-3xl rounded-bl-3xl rotate-45 border border-emerald-700 shadow-3xs" />
                          <div className="absolute bottom-12 left-14 w-5 h-4 bg-emerald-600 rounded-tl-3xl rounded-br-3xl -rotate-12 border border-emerald-700 shadow-3xs" />
                          <div className="absolute top-14 right-10 w-4 h-5 bg-emerald-600 rounded-tr-3xl rounded-bl-3xl rotate-[115deg] border border-emerald-700 shadow-3xs" />
                          <div className="absolute top-12 right-16 w-6 h-4 bg-white/80 rounded-full blur-[1px] opacity-90 shadow-3xs" />
                          <div className="absolute bottom-12 left-10 w-6 h-6 bg-white/95 rounded-full blur-[1px] opacity-90 shadow-3xs" />
                          <div className="absolute top-20 left-16 w-4.5 h-3.5 bg-white/80 rounded-full blur-[1px] opacity-95 shadow-3xs" />
                        </>
                      )}

                      {selectedPizza?.name.includes("Pepperoni") && (
                        <>
                          <div className="absolute top-8 left-12 w-5.5 h-5.5 bg-rose-600 rounded-full border-2 border-rose-800 shadow-2xs" />
                          <div className="absolute top-10 right-12 w-5.5 h-5.5 bg-rose-600 rounded-full border-2 border-rose-800 shadow-2xs" />
                          <div className="absolute bottom-10 left-14 w-5.5 h-5.5 bg-rose-600 rounded-full border-2 border-rose-800 shadow-2xs" />
                          <div className="absolute bottom-8 right-12 w-5.5 h-5.5 bg-rose-600 rounded-full border-2 border-rose-800 shadow-2xs" />
                          <div className="absolute top-[44%] left-[44%] w-5.5 h-5.5 bg-rose-600 rounded-full border-2 border-rose-800 shadow-2xs" />
                        </>
                      )}

                      {/* Veggie templates defaults */}
                      {(selectedPizza?.name.includes("Veggie") || selectedPizza?.name.includes("Mediterranean") || selectedPizza?.name.includes("Farm")) && (
                        <>
                          {/* Green bell peppers */}
                          <div className="absolute top-8 left-14 w-5 h-1.5 border-t-3 border-emerald-500 rounded-full rotate-45" />
                          <div className="absolute bottom-10 right-14 w-5 h-1.5 border-t-3 border-emerald-500 rounded-full -rotate-45" />
                          {/* Black olives */}
                          <div className="absolute top-10 right-14 w-2.5 h-2.5 bg-slate-900 rounded-full border border-black flex items-center justify-center">
                            <div className="w-0.5 h-0.5 bg-yellow-400 rounded-full" />
                          </div>
                          <div className="absolute bottom-8 left-12 w-2.5 h-2.5 bg-slate-900 rounded-full border border-black flex items-center justify-center">
                            <div className="w-0.5 h-0.5 bg-yellow-400 rounded-full" />
                          </div>
                          {/* Red Onions */}
                          <div className="absolute top-[45%] left-[20%] w-4.5 h-1 border-t-2 border-purple-400 rounded-full rotate-12" />
                          <div className="absolute top-[22%] right-[28%] w-4.5 h-1 border-t-2 border-purple-400 rounded-full rotate-90" />
                        </>
                      )}

                      {/* Dynamic Topping visual instances popping with scale */}
                      <AnimatePresence>
                        {selectedToppings.map((toppingName, toppingIdx) => {
                          const icon = getToppingIcon(toppingName);
                          // Generate 3 scattering indexes
                          const scatteringIndexes = [
                            (toppingIdx * 3) % 8, 
                            (toppingIdx * 3 + 2) % 8, 
                            (toppingIdx * 3 + 5) % 8
                          ];

                          return scatteringIndexes.map((coordIdx, instIdx) => {
                            const coord = TOPPING_COORDINATES[coordIdx];
                            return (
                              <motion.div
                                key={`${toppingName}-${instIdx}`}
                                initial={{ scale: 0, opacity: 0, y: -25 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: 15 }}
                                transition={{ type: "spring", stiffness: 220, damping: 15, delay: instIdx * 0.05 }}
                                className="absolute z-20 pointer-events-none drop-shadow-sm bg-white rounded-full p-1 border border-slate-200/50 flex items-center justify-center scale-75"
                                style={{
                                  top: coord.top,
                                  left: coord.left,
                                }}
                              >
                                {icon}
                              </motion.div>
                            );
                          });
                        })}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  <div className="text-center text-4xs text-slate-400 italic font-mono leading-none mt-2">
                    Visual baking simulation. Tap toppings below to dress.
                  </div>
                </div>

                {/* Right Column: Customizer Selector controls */}
                <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
                  {/* Pizza Select */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 font-mono block mb-2 uppercase">1. CHOOSE TEMPLATE</label>
                    <select
                      value={selectedPizza?.name || ""}
                      onChange={(e) => {
                        const p = pizzas.find((pizza) => pizza.name === e.target.value);
                        if (p) {
                          setSelectedPizza(p);
                          if (p.name === "Margherita") {
                            setSelectedToppings([]);
                          }
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-semibold text-sm p-3 rounded-xl transition-all outline-none"
                      id="select-pizza-template"
                    >
                      {pizzas.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} (Base: ₹{p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Select */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 font-mono block mb-2 uppercase">2. SELECT CRUST BASE</label>
                    <div className="space-y-2" id="crust-selection-list">
                      {bases.map((b) => (
                        <button
                          key={b.name}
                          onClick={() => setSelectedBase(b)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            selectedBase?.name === b.name
                              ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 shadow-3xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <span className="font-bold text-sm text-slate-800 block">{b.name}</span>
                            <span className="text-3xs text-slate-400 leading-none">{b.description}</span>
                          </div>
                          <span className="font-mono text-sm font-extrabold text-slate-700">+₹{b.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 font-mono block mb-2 uppercase">3. SELECT PIZZA SIZE</label>
                    <div className="grid grid-cols-3 gap-2" id="size-options">
                      {[
                        { size: "Small", multi: "1.0x", desc: "Personal" },
                        { size: "Medium", multi: "1.2x", desc: "Regular" },
                        { size: "Large", multi: "1.5x", desc: "Shareable" },
                      ].map((item) => (
                        <button
                          key={item.size}
                          onClick={() => setSelectedSize(item.size as any)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedSize === item.size
                              ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 shadow-3xs font-bold text-indigo-700"
                              : "bg-white border-slate-200 hover:border-slate-300 font-semibold text-slate-700"
                          }`}
                        >
                          <span className="text-sm block">{item.size}</span>
                          <span className="text-4xs text-slate-400 block tracking-wider mt-0.5">{item.desc} ({item.multi})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toppings Selector */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-slate-400 font-mono block uppercase">4. ADD TOPPINGS ({selectedToppings.length}/5)</label>
                    </div>

                    {selectedPizza?.name === "Margherita" ? (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                        <div className="mx-auto w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                          <Check className="w-5 h-5 animate-pulse" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Classic Margherita Recipe</p>
                        <p className="text-4xs text-slate-400 leading-normal max-w-xs mx-auto">
                          Classic Margherita is strictly styled with its signature mozzarella, tomato sauce, and basil. For optimal flavor integrity, additional toppings are restricted.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1" id="toppings-selection-list">
                        {toppings.map((t) => {
                          const isSelected = selectedToppings.includes(t.name);
                          return (
                            <button
                              key={t.name}
                              onClick={() => handleToggleTopping(t.name)}
                              className={`p-2.5 rounded-xl border transition-all text-left flex items-center justify-between text-xs cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-50 border-indigo-200 font-bold text-indigo-900 shadow-3xs"
                                  : "bg-white border-slate-200 hover:border-slate-300 font-medium text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {getToppingIcon(t.name)}
                                <span className="truncate">{t.name}</span>
                              </div>
                              <span className="font-mono text-slate-400 shrink-0">+₹{t.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary and Quantity */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1.5 shrink-0">
                  <button
                    onClick={() => setCustomizerQty(Math.max(1, customizerQty - 1))}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-sm w-8 text-center font-mono">{customizerQty}</span>
                  <button
                    onClick={() => setCustomizerQty(Math.min(10, customizerQty + 1))}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtotal preview */}
                <div className="text-center sm:text-right flex-1">
                  <p className="text-3xs font-bold text-slate-400 font-mono uppercase tracking-wider">PIZZA BUILD PRICE</p>
                  <p className="text-2xl font-black text-slate-900 font-mono">
                    ₹{calculateCustomizerPrice() * customizerQty}
                  </p>
                  <p className="text-4xs text-slate-400 mt-0.5">₹{calculateCustomizerPrice()} each x {customizerQty}</p>
                </div>

                {/* Action button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedPizza || !selectedBase}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-add-to-cart"
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Checkout Cart Form */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 sticky top-6" id="checkout-sidebar">
        <div>
          <h3 className="text-lg font-black font-display text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            Sizzling Checkout Cart
          </h3>
          <p className="text-xs text-slate-500">View items, quantities, and place your order</p>
        </div>

        {/* Cart items list */}
        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 border-b border-slate-100 pb-4" id="cart-items-container">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-400 flex flex-col items-center">
              <PizzaIcon className="w-8 h-8 opacity-40 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">Your pizza box is empty!</p>
              <p className="text-4xs text-slate-400 mt-1">Add items to build your feast.</p>
            </div>
          ) : (
            cart.map(({ id, item }) => (
              <div key={id} className="flex justify-between items-start text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-800">{item.quantity}x</span>
                    <span className="font-semibold text-slate-800 truncate font-display">{item.pizzaName}</span>
                    <span className="text-4xs font-mono text-slate-400">({item.size})</span>
                  </div>
                  <p className="text-4xs text-slate-400 truncate pl-5">
                    Crust: {item.baseName}
                    {item.toppings.length > 0 && ` • Toppings: ${item.toppings.join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700">₹{item.price * item.quantity}</span>
                  <button
                    onClick={() => handleRemoveFromCart(id)}
                    className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals panel */}
        {cart.length > 0 && (
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>10% Qty Discount</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>GST (18%)</span>
              <span>₹{gst}</span>
            </div>
            <div className="h-[1px] bg-slate-200 my-1.5"></div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total Bill</span>
              <span>₹{total}</span>
            </div>

            {totalPizzas >= 5 ? (
              <p className="text-3xs text-emerald-600 font-semibold text-center mt-2 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Quantity Discount Applied!
              </p>
            ) : (
              <p className="text-4xs text-slate-400 text-center mt-2 leading-tight">
                Add {5 - totalPizzas} more pizza{5 - totalPizzas > 1 ? "s" : ""} to activate 10% auto discount!
              </p>
            )}
          </div>
        )}

        {/* Customer Intake Checkout Form */}
        <form onSubmit={handleCheckout} className="space-y-4 pt-2">
          {/* Customer Name */}
          <div>
            <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Customer Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter full name"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-xs p-3 pl-10 rounded-xl outline-none transition-all"
                id="input-customer-name"
              />
            </div>
            {formErrors.name && <p className="text-rose-600 text-4xs font-semibold mt-1">{formErrors.name}</p>}
          </div>

          {/* Customer Phone */}
          <div>
            <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Mobile Phone (10 digits)</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="6xxxxxxxxx, 7xxxxxxxx..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-xs p-3 pl-10 rounded-xl outline-none transition-all"
                id="input-customer-phone"
              />
            </div>
            {formErrors.phone && <p className="text-rose-600 text-4xs font-semibold mt-1">{formErrors.phone}</p>}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-3xs font-bold text-slate-400 font-mono uppercase block mb-1">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2" id="payment-modes">
              {["UPI", "Card", "Cash"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode as any)}
                  className={`p-2 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                    paymentMode === mode
                      ? "bg-indigo-50 border-indigo-200 font-bold text-indigo-700"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Error / Feedback Block */}
          {formErrors.general && (
            <p className="text-rose-600 text-3xs font-bold text-center bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
              {formErrors.general}
            </p>
          )}

          {/* Checkout Button */}
          <button
            type="submit"
            disabled={cart.length === 0 || submittingOrder}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            id="btn-checkout-submit"
          >
            {submittingOrder ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Place Order (₹{total})
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
