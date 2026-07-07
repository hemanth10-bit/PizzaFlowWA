import express from "express";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// Enable CORS for all requests, including sandboxed iframes
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// --- Supabase client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set in environment variables.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// --- OpenRouter / OpenAI Client Initialization ---
const openRouterKey = process.env.OPENROUTER_API_KEY;
if (!openRouterKey) {
  console.error("OPENROUTER_API_KEY is not configured in your environment variables.");
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: openRouterKey || "",
  defaultHeaders: {
    "HTTP-Referer": process.env.YOUR_SITE_URL || "http://localhost:3000",
    "X-Title": process.env.YOUR_SITE_NAME || "SliceMatic",
  }
});

// Define your preferred OpenRouter model string (e.g., "google/gemini-2.5-flash" or "openai/gpt-4o-mini")
const OPENROUTER_MODEL = "google/gemini-2.5-flash";

// --- Data access helpers (Supabase-backed) ---

async function loadBases() {
  const { data, error } = await supabase.from("bases").select("*");
  if (error) {
    console.error("Error loading bases from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((b) => ({ name: b.name, price: Number(b.price), description: b.description }));
}

async function loadPizzas() {
  const { data, error } = await supabase.from("pizzas").select("*");
  if (error) {
    console.error("Error loading pizzas from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((p) => ({ name: p.name, price: Number(p.price), description: p.description, category: p.category }));
}

async function loadToppings() {
  const { data, error } = await supabase.from("toppings").select("*");
  if (error) {
    console.error("Error loading toppings from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((t) => ({ name: t.name, price: Number(t.price), category: t.category }));
}

async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("timestamp", { ascending: false });
  if (error) {
    console.error("Error loading orders from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    timestamp: o.timestamp,
    items: o.items,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    gst: Number(o.gst),
    total: Number(o.total),
    paymentMode: o.payment_mode,
    status: o.status,
  }));
}

async function insertOrder(order) {
  const { error } = await supabase.from("orders").insert({
    id: order.id,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    timestamp: order.timestamp,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    gst: order.gst,
    total: order.total,
    payment_mode: order.paymentMode,
    status: order.status,
  });
  if (error) {
    console.error("Error inserting order into Supabase", error);
    throw new Error(error.message);
  }
}

async function updateOrderStatus(id, status) {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select().single();
  if (error) {
    console.error("Error updating order status in Supabase", error);
    throw new Error(error.message);
  }
  return data;
}

// --- API Routes ---

app.get("/api/menu", async (req, res) => {
  try {
    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);
    res.json({ bases, pizzas, toppings });
  } catch (err) {
    res.status(500).json({ error: "Failed to load menu: " + err.message });
  }
});

app.post("/api/menu/update", async (req, res) => {
  try {
    const { bases, pizzas, toppings } = req.body;

    if (bases) {
      await supabase.from("bases").delete().neq("id", 0);
      const { error } = await supabase.from("bases").insert(
        bases.map((b) => ({ name: b.name, price: b.price, description: b.description || "" }))
      );
      if (error) throw new Error(error.message);
    }
    if (pizzas) {
      await supabase.from("pizzas").delete().neq("id", 0);
      const { error } = await supabase.from("pizzas").insert(
        pizzas.map((p) => ({ name: p.name, price: p.price, description: p.description || "", category: p.category || "Veg" }))
      );
      if (error) throw new Error(error.message);
    }
    if (toppings) {
      await supabase.from("toppings").delete().neq("id", 0);
      const { error } = await supabase.from("toppings").insert(
        toppings.map((t) => ({ name: t.name, price: t.price, category: t.category || "Veg" }))
      );
      if (error) throw new Error(error.message);
    }
    res.json({ success: true, message: "Menu updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update menu: " + err.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await loadOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to load orders: " + err.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, customerPhone, items, paymentMode } = req.body;

    if (!customerName || !/^[A-Za-z\s]{2,40}$/.test(customerName.trim())) {
      return res.status(400).json({
        error: "Invalid Customer Name. Only alphabets and spaces allowed, 2 to 40 characters.",
      });
    }

    if (!customerPhone || !/^[6-9]\d{9}$/.test(customerPhone.trim())) {
      return res.status(400).json({
        error: "Invalid Phone Number. Must be a 10-digit number starting with 6, 7, 8, or 9.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." });
    }

    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);

    let totalQuantity = 0;
    let computedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { pizzaName, baseName, size, toppings: itemToppings, quantity } = item;

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ error: "Pizza quantity must be between 1 and 10." });
      }
      totalQuantity += qty;

      const pizzaObj = pizzas.find((p) => p.name === pizzaName);
      if (!pizzaObj) {
        return res.status(400).json({ error: `Selected pizza '${pizzaName}' is not in the menu.` });
      }

      const baseObj = bases.find((b) => b.name === baseName);
      if (!baseObj) {
        return res.status(400).json({ error: `Selected base '${baseName}' is not in the menu.` });
      }

      let sizeMultiplier = 1.0;
      if (size === "Medium") sizeMultiplier = 1.2;
      else if (size === "Large") sizeMultiplier = 1.5;

      const pizzaBaseCombined = (pizzaObj.price + baseObj.price) * sizeMultiplier;

      let toppingsTotal = 0;
      const validToppings = [];
      if (itemToppings && Array.isArray(itemToppings)) {
        for (const tName of itemToppings) {
          const toppingObj = toppings.find((t) => t.name === tName);
          if (toppingObj) {
            toppingsTotal += toppingObj.price;
            validToppings.push(tName);
          }
        }
      }

      if (pizzaName.toLowerCase() === "margherita" && validToppings.length > 0) {
        return res.status(400).json({ error: "Margherita pizza cannot contain any toppings." });
      }

      if (validToppings.length > 5) {
        return res.status(400).json({ error: "Maximum of 5 toppings allowed per pizza." });
      }

      const singleItemPrice = Math.round(pizzaBaseCombined + toppingsTotal);
      computedSubtotal += singleItemPrice * qty;

      validatedItems.push({
        pizzaName,
        baseName,
        size,
        toppings: validToppings,
        quantity: qty,
        price: singleItemPrice,
      });
    }

    let discount = 0;
    if (totalQuantity >= 5) {
      discount = Math.round(computedSubtotal * 0.1);
    }

    const postDiscountTotal = computedSubtotal - discount;
    const gst = Math.round(postDiscountTotal * 0.18 * 10) / 10;
    const total = Math.round((postDiscountTotal + gst) * 10) / 10;

    const validPaymentModes = ["Cash", "Card", "UPI"];
    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({ error: "Invalid payment mode. Choose Cash, Card, or UPI." });
    }

    const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
    const newId = `ORD-${1000 + (count || 0) + 1}`;

    const newOrder = {
      id: newId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      timestamp: new Date().toISOString(),
      items: validatedItems,
      subtotal: computedSubtotal,
      discount,
      gst,
      total,
      paymentMode,
      status: "pending",
    };

    await insertOrder(newOrder);

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to place order: " + err.message });
  }
});

app.put("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      id: updated.id,
      customerName: updated.customer_name,
      customerPhone: updated.customer_phone,
      timestamp: updated.timestamp,
      items: updated.items,
      subtotal: Number(updated.subtotal),
      discount: Number(updated.discount),
      gst: Number(updated.gst),
      total: Number(updated.total),
      paymentMode: updated.payment_mode,
      status: updated.status,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update order status: " + err.message });
  }
});

// --- AI endpoints ---

app.post("/api/ai/forecast", async (req, res) => {
  try {
    const orders = await loadOrders();
    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);

    const prompt = `
You are the AI Demand Planner and Inventory Forecaster for SliceMatic, a premium pizza outlet.
Analyze the following order history spanning the past several days and provide a comprehensive, structured demand forecast and inventory planning recommendation.

Order History (JSON):
${JSON.stringify(orders, null, 2)}

Active Menu Information:
Bases: ${JSON.stringify(bases)}
Pizzas: ${JSON.stringify(pizzas)}
Toppings: ${JSON.stringify(toppings)}

Generate your response strictly in JSON format matching the schema below:
{
  "summary": "High level brief of the upcoming demand trends.",
  "recommendedInventoryPurchases": [
    { "ingredient": "e.g. Cheese/Pepperoni/Paneer/Mushrooms", "priority": "High/Medium/Low", "reason": "Data-backed reasoning", "suggestedIncreasePercentage": 15 }
  ],
  "peakHoursForecast": "Brief description of estimated peak hours and busiest days.",
  "pizzasDemandForecast": [
    { "name": "Pizza Type", "predictedVolumeNextWeek": 25, "trend": "up/down/stable" }
  ]
}

Make sure your output is parseable JSON only. Do not wrap in markdown fences.
`;

    // Call OpenRouter with the OpenAI format
    const response = await openai.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content || "{}";
    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    res.status(500).json({ error: "AI forecasting failed: " + err.message });
  }
});

app.post("/api/ai/insights", async (req, res) => {
  try {
    const orders = await loadOrders();

    const prompt = `
You are the Business Analyst AI for Rajan, the owner of SliceMatic.
Analyze the following pizza ordering log data and generate 4-5 key, actionable, plain-language business insights (e.g. popular toppings, payment methods, upselling opportunities, or customer habits).
Keep them concise, exciting, and professional.

Order Data:
${JSON.stringify(orders, null, 2)}

Provide your response strictly in JSON format matching this schema:
{
  "insights": [
    {
      "title": "Short title",
      "metric": "e.g., +20% or 'Most Popular'",
      "description": "Full plain-language business insight with data backing."
    }
  ]
}

Make sure your output is parseable JSON only. Do not wrap in markdown fences.
`;

    // Call OpenRouter with the OpenAI format
    const response = await openai.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content || "{}";
    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    res.status(500).json({ error: "AI insights failed: " + err.message });
  }
});

export default app;    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is not configured. Please configure it in your environment variables or Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// --- Data access helpers (Supabase-backed) ---

async function loadBases() {
  const { data, error } = await supabase.from("bases").select("*");
  if (error) {
    console.error("Error loading bases from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((b) => ({ name: b.name, price: Number(b.price), description: b.description }));
}

async function loadPizzas() {
  const { data, error } = await supabase.from("pizzas").select("*");
  if (error) {
    console.error("Error loading pizzas from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((p) => ({ name: p.name, price: Number(p.price), description: p.description, category: p.category }));
}

async function loadToppings() {
  const { data, error } = await supabase.from("toppings").select("*");
  if (error) {
    console.error("Error loading toppings from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((t) => ({ name: t.name, price: Number(t.price), category: t.category }));
}

async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("timestamp", { ascending: false });
  if (error) {
    console.error("Error loading orders from Supabase", error);
    throw new Error(error.message);
  }
  return data.map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    timestamp: o.timestamp,
    items: o.items,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    gst: Number(o.gst),
    total: Number(o.total),
    paymentMode: o.payment_mode,
    status: o.status,
  }));
}

async function insertOrder(order) {
  const { error } = await supabase.from("orders").insert({
    id: order.id,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    timestamp: order.timestamp,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    gst: order.gst,
    total: order.total,
    payment_mode: order.paymentMode,
    status: order.status,
  });
  if (error) {
    console.error("Error inserting order into Supabase", error);
    throw new Error(error.message);
  }
}

async function updateOrderStatus(id, status) {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select().single();
  if (error) {
    console.error("Error updating order status in Supabase", error);
    throw new Error(error.message);
  }
  return data;
}

// --- API Routes ---

app.get("/api/menu", async (req, res) => {
  try {
    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);
    res.json({ bases, pizzas, toppings });
  } catch (err) {
    res.status(500).json({ error: "Failed to load menu: " + err.message });
  }
});

app.post("/api/menu/update", async (req, res) => {
  try {
    const { bases, pizzas, toppings } = req.body;

    if (bases) {
      await supabase.from("bases").delete().neq("id", 0);
      const { error } = await supabase.from("bases").insert(
        bases.map((b) => ({ name: b.name, price: b.price, description: b.description || "" }))
      );
      if (error) throw new Error(error.message);
    }
    if (pizzas) {
      await supabase.from("pizzas").delete().neq("id", 0);
      const { error } = await supabase.from("pizzas").insert(
        pizzas.map((p) => ({ name: p.name, price: p.price, description: p.description || "", category: p.category || "Veg" }))
      );
      if (error) throw new Error(error.message);
    }
    if (toppings) {
      await supabase.from("toppings").delete().neq("id", 0);
      const { error } = await supabase.from("toppings").insert(
        toppings.map((t) => ({ name: t.name, price: t.price, category: t.category || "Veg" }))
      );
      if (error) throw new Error(error.message);
    }
    res.json({ success: true, message: "Menu updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update menu: " + err.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await loadOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to load orders: " + err.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, customerPhone, items, paymentMode } = req.body;

    if (!customerName || !/^[A-Za-z\s]{2,40}$/.test(customerName.trim())) {
      return res.status(400).json({
        error: "Invalid Customer Name. Only alphabets and spaces allowed, 2 to 40 characters.",
      });
    }

    if (!customerPhone || !/^[6-9]\d{9}$/.test(customerPhone.trim())) {
      return res.status(400).json({
        error: "Invalid Phone Number. Must be a 10-digit number starting with 6, 7, 8, or 9.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." });
    }

    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);

    let totalQuantity = 0;
    let computedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { pizzaName, baseName, size, toppings: itemToppings, quantity } = item;

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ error: "Pizza quantity must be between 1 and 10." });
      }
      totalQuantity += qty;

      const pizzaObj = pizzas.find((p) => p.name === pizzaName);
      if (!pizzaObj) {
        return res.status(400).json({ error: `Selected pizza '${pizzaName}' is not in the menu.` });
      }

      const baseObj = bases.find((b) => b.name === baseName);
      if (!baseObj) {
        return res.status(400).json({ error: `Selected base '${baseName}' is not in the menu.` });
      }

      let sizeMultiplier = 1.0;
      if (size === "Medium") sizeMultiplier = 1.2;
      else if (size === "Large") sizeMultiplier = 1.5;

      const pizzaBaseCombined = (pizzaObj.price + baseObj.price) * sizeMultiplier;

      let toppingsTotal = 0;
      const validToppings = [];
      if (itemToppings && Array.isArray(itemToppings)) {
        for (const tName of itemToppings) {
          const toppingObj = toppings.find((t) => t.name === tName);
          if (toppingObj) {
            toppingsTotal += toppingObj.price;
            validToppings.push(tName);
          }
        }
      }

      if (pizzaName.toLowerCase() === "margherita" && validToppings.length > 0) {
        return res.status(400).json({ error: "Margherita pizza cannot contain any toppings." });
      }

      if (validToppings.length > 5) {
        return res.status(400).json({ error: "Maximum of 5 toppings allowed per pizza." });
      }

      const singleItemPrice = Math.round(pizzaBaseCombined + toppingsTotal);
      computedSubtotal += singleItemPrice * qty;

      validatedItems.push({
        pizzaName,
        baseName,
        size,
        toppings: validToppings,
        quantity: qty,
        price: singleItemPrice,
      });
    }

    let discount = 0;
    if (totalQuantity >= 5) {
      discount = Math.round(computedSubtotal * 0.1);
    }

    const postDiscountTotal = computedSubtotal - discount;
    const gst = Math.round(postDiscountTotal * 0.18 * 10) / 10;
    const total = Math.round((postDiscountTotal + gst) * 10) / 10;

    const validPaymentModes = ["Cash", "Card", "UPI"];
    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({ error: "Invalid payment mode. Choose Cash, Card, or UPI." });
    }

    const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
    const newId = `ORD-${1000 + (count || 0) + 1}`;

    const newOrder = {
      id: newId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      timestamp: new Date().toISOString(),
      items: validatedItems,
      subtotal: computedSubtotal,
      discount,
      gst,
      total,
      paymentMode,
      status: "pending",
    };

    await insertOrder(newOrder);

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to place order: " + err.message });
  }
});

app.put("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      id: updated.id,
      customerName: updated.customer_name,
      customerPhone: updated.customer_phone,
      timestamp: updated.timestamp,
      items: updated.items,
      subtotal: Number(updated.subtotal),
      discount: Number(updated.discount),
      gst: Number(updated.gst),
      total: Number(updated.total),
      paymentMode: updated.payment_mode,
      status: updated.status,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update order status: " + err.message });
  }
});

// --- AI endpoints ---

app.post("/api/ai/forecast", async (req, res) => {
  try {
    const orders = await loadOrders();
    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);

    const ai = getGeminiClient();

    const prompt = `
You are the AI Demand Planner and Inventory Forecaster for SliceMatic, a premium pizza outlet.
Analyze the following order history spanning the past several days and provide a comprehensive, structured demand forecast and inventory planning recommendation.

Order History (JSON):
${JSON.stringify(orders, null, 2)}

Active Menu Information:
Bases: ${JSON.stringify(bases)}
Pizzas: ${JSON.stringify(pizzas)}
Toppings: ${JSON.stringify(toppings)}

Generate your response strictly in JSON format matching the schema below:
{
  "summary": "High level brief of the upcoming demand trends.",
  "recommendedInventoryPurchases": [
    { "ingredient": "e.g. Cheese/Pepperoni/Paneer/Mushrooms", "priority": "High/Medium/Low", "reason": "Data-backed reasoning", "suggestedIncreasePercentage": 15 }
  ],
  "peakHoursForecast": "Brief description of estimated peak hours and busiest days.",
  "pizzasDemandForecast": [
    { "name": "Pizza Type", "predictedVolumeNextWeek": 25, "trend": "up/down/stable" }
  ]
}

Make sure your output is parseable JSON only. Do not wrap in markdown fences.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    res.status(500).json({ error: "AI forecasting failed: " + err.message });
  }
});

app.post("/api/ai/insights", async (req, res) => {
  try {
    const orders = await loadOrders();
    const ai = getGeminiClient();

    const prompt = `
You are the Business Analyst AI for Rajan, the owner of SliceMatic.
Analyze the following pizza ordering log data and generate 4-5 key, actionable, plain-language business insights (e.g. popular toppings, payment methods, upselling opportunities, or customer habits).
Keep them concise, exciting, and professional.

Order Data:
${JSON.stringify(orders, null, 2)}

Provide your response strictly in JSON format matching this schema:
{
  "insights": [
    {
      "title": "Short title",
      "metric": "e.g., +20% or 'Most Popular'",
      "description": "Full plain-language business insight with data backing."
    }
  ]
}

Make sure your output is parseable JSON only. Do not wrap in markdown fences.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    res.status(500).json({ error: "AI insights failed: " + err.message });
  }
});

export default app;
