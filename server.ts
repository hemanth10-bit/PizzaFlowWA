import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory caching/handling of files
const BASES_FILE = path.join(process.cwd(), "data", "bases.txt");
const PIZZAS_FILE = path.join(process.cwd(), "data", "pizzas.txt");
const TOPPINGS_FILE = path.join(process.cwd(), "data", "toppings.txt");
const ORDERS_JSON_FILE = path.join(process.cwd(), "data", "orders.json");
const ORDERS_LOG_FILE = path.join(process.cwd(), "data", "orders_log.txt");

// Ensure data folder exists
async function ensureDataFolder() {
  try {
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
  } catch (err) {
    console.error("Error creating data folder", err);
  }
}

// Lazy initializer for Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Secrets. Please configure it in Settings > Secrets.");
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

// Helpers for loading and parsing .txt files
async function loadBases() {
  try {
    const data = await fs.readFile(BASES_FILE, "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [name, price, description] = line.split("|").map((s) => s.trim());
        return { name, price: parseFloat(price), description };
      });
  } catch (err) {
    console.error("Error loading bases.txt, using defaults", err);
    return [
      { name: "Thin Crust", price: 100, description: "Light and crispy classic base" },
      { name: "Thick Crust", price: 120, description: "Soft and doughy pan-style base" },
      { name: "Gluten Free", price: 150, description: "Healthy alternative made without wheat" },
      { name: "Cheese Burst", price: 180, description: "Loaded with liquid cheese inside the crust" },
    ];
  }
}

async function loadPizzas() {
  try {
    const data = await fs.readFile(PIZZAS_FILE, "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [name, price, description, category] = line.split("|").map((s) => s.trim());
        return { name, price: parseFloat(price), description, category };
      });
  } catch (err) {
    console.error("Error loading pizzas.txt, using defaults", err);
    return [
      { name: "Margherita", price: 250, description: "Classic tomato sauce, mozzarella, and fresh basil", category: "Veg" },
      { name: "Veggie Supreme", price: 320, description: "Onions, capsicum, mushrooms, sweet corn, and olives", category: "Veg" },
      { name: "Paneer Tikka", price: 350, description: "Spicy marinated paneer cubes, capsicum, and onions", category: "Veg" },
      { name: "Chicken BBQ", price: 380, description: "Grilled barbecue chicken, red onions, and cilantro", category: "Non-Veg" },
      { name: "Pepperoni Feast", price: 400, description: "Double pepperoni slices with extra mozzarella cheese", category: "Non-Veg" },
    ];
  }
}

async function loadToppings() {
  try {
    const data = await fs.readFile(TOPPINGS_FILE, "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [name, price, category] = line.split("|").map((s) => s.trim());
        return { name, price: parseFloat(price), category };
      });
  } catch (err) {
    console.error("Error loading toppings.txt, using defaults", err);
    return [
      { name: "Extra Cheese", price: 50, category: "Veg" },
      { name: "Mushrooms", price: 40, category: "Veg" },
      { name: "Black Olives", price: 45, category: "Veg" },
      { name: "Jalapenos", price: 40, category: "Veg" },
      { name: "Golden Corn", price: 35, category: "Veg" },
      { name: "Paneer Cubes", price: 60, category: "Veg" },
      { name: "Grilled Chicken", price: 80, category: "Non-Veg" },
      { name: "Pepperoni Slices", price: 90, category: "Non-Veg" },
    ];
  }
}

async function loadOrders() {
  try {
    const data = await fs.readFile(ORDERS_JSON_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error loading orders.json, starting empty", err);
    return [];
  }
}

async function saveOrders(orders: any[]) {
  await ensureDataFolder();
  await fs.writeFile(ORDERS_JSON_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

// Appends order to orders_log.txt
async function appendToOrderLog(order: any) {
  await ensureDataFolder();
  const itemSummary = order.items
    .map((item: any) => {
      const toppingsStr = item.toppings.length > 0 ? `, Toppings: ${item.toppings.join(", ")}` : "";
      return `${item.quantity}x ${item.pizzaName} [${item.baseName}, ${item.size}${toppingsStr}]`;
    })
    .join(" + ");

  const logLine = `${order.id} | ${order.timestamp} | ${order.customerName} | ${order.customerPhone} | ${itemSummary} | ${order.subtotal} | ${order.discount} | ${order.gst} | ${order.total} | ${order.paymentMode} | ${order.status}\n`;
  await fs.appendFile(ORDERS_LOG_FILE, logLine, "utf-8");
}

// API Routes

// Get complete menu
app.get("/api/menu", async (req, res) => {
  try {
    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);
    res.json({ bases, pizzas, toppings });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load menu: " + err.message });
  }
});

// Update Menu items (CRUD for Admin portal)
app.post("/api/menu/update", async (req, res) => {
  try {
    const { bases, pizzas, toppings } = req.body;
    if (bases) {
      const basesContent = bases.map((b: any) => `${b.name} | ${b.price} | ${b.description || ""}`).join("\n");
      await fs.writeFile(BASES_FILE, basesContent, "utf-8");
    }
    if (pizzas) {
      const pizzasContent = pizzas.map((p: any) => `${p.name} | ${p.price} | ${p.description || ""} | ${p.category || "Veg"}`).join("\n");
      await fs.writeFile(PIZZAS_FILE, pizzasContent, "utf-8");
    }
    if (toppings) {
      const toppingsContent = toppings.map((t: any) => `${t.name} | ${t.price} | ${t.category || "Veg"}`).join("\n");
      await fs.writeFile(TOPPINGS_FILE, toppingsContent, "utf-8");
    }
    res.json({ success: true, message: "Menu updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update menu: " + err.message });
  }
});

// Get all orders
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await loadOrders();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load orders: " + err.message });
  }
});

// Create a new order (Customer checkout)
app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, customerPhone, items, paymentMode } = req.body;

    // VALIDATIONS:
    // Name: alphabets and spaces only, 2-40 characters
    if (!customerName || !/^[A-Za-z\s]{2,40}$/.test(customerName.trim())) {
      return res.status(400).json({
        error: "Invalid Customer Name. Only alphabets and spaces allowed, 2 to 40 characters.",
      });
    }

    // Phone: 10 digits starting with 6,7,8,9
    if (!customerPhone || !/^[6-9]\d{9}$/.test(customerPhone.trim())) {
      return res.status(400).json({
        error: "Invalid Phone Number. Must be a 10-digit number starting with 6, 7, 8, or 9.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." });
    }

    // Load current menu to calculate server-authoritative prices
    const [bases, pizzas, toppings] = await Promise.all([loadBases(), loadPizzas(), loadToppings()]);

    let totalQuantity = 0;
    let computedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { pizzaName, baseName, size, toppings: itemToppings, quantity } = item;

      // Quantity rules: 1-10 only
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ error: "Pizza quantity must be between 1 and 10." });
      }
      totalQuantity += qty;

      // Find pizza base price
      const pizzaObj = pizzas.find((p) => p.name === pizzaName);
      if (!pizzaObj) {
        return res.status(400).json({ error: `Selected pizza '${pizzaName}' is not in the menu.` });
      }

      // Find base price
      const baseObj = bases.find((b) => b.name === baseName);
      if (!baseObj) {
        return res.status(400).json({ error: `Selected base '${baseName}' is not in the menu.` });
      }

      // Size multiplier: Small (1.0x), Medium (1.2x), Large (1.5x)
      let sizeMultiplier = 1.0;
      if (size === "Medium") sizeMultiplier = 1.2;
      else if (size === "Large") sizeMultiplier = 1.5;

      // Calculate pizza + base price with size multiplier
      const pizzaBaseCombined = (pizzaObj.price + baseObj.price) * sizeMultiplier;

      // Find toppings prices
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

      // Margherita toppings restriction
      if (pizzaName.toLowerCase() === "margherita" && validToppings.length > 0) {
        return res.status(400).json({ error: "Margherita pizza cannot contain any toppings." });
      }

      // Topping combination check: Cap on custom toppings? Let's cap at max 5 toppings for safety
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

    // Discount rules: 10% discount auto-applied at 5+ total pizzas
    let discount = 0;
    if (totalQuantity >= 5) {
      discount = Math.round(computedSubtotal * 0.1);
    }

    const postDiscountTotal = computedSubtotal - discount;

    // GST: 18% GST calculated on the post-discount total
    const gst = Math.round(postDiscountTotal * 0.18 * 10) / 10;
    const total = Math.round((postDiscountTotal + gst) * 10) / 10;

    // Payment mode validation
    const validPaymentModes = ["Cash", "Card", "UPI"];
    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({ error: "Invalid payment mode. Choose Cash, Card, or UPI." });
    }

    const orders = await loadOrders();
    const newId = `ORD-${1000 + orders.length + 1}`;

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
      status: "pending", // pending -> preparing -> ready -> completed
    };

    orders.push(newOrder);
    await saveOrders(orders);

    // Append to orders_log.txt in the parseable format
    await appendToOrderLog(newOrder);

    res.status(201).json(newOrder);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to place order: " + err.message });
  }
});

// Update order status (Admin operation)
app.put("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const orders = await loadOrders();
    const orderIndex = orders.findIndex((o: any) => o.id === id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    orders[orderIndex].status = status;
    await saveOrders(orders);

    // Also write to log again if completed
    if (status === "completed") {
      await appendToOrderLog(orders[orderIndex]);
    }

    res.json(orders[orderIndex]);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update order status: " + err.message });
  }
});

// AI endpoints

// AI inventory forecasting endpoint
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

Current local time is: 2026-07-03.

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
  } catch (err: any) {
    res.status(500).json({ error: "AI forecasting failed: " + err.message });
  }
});

// AI plain-language sales insights
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
  } catch (err: any) {
    res.status(500).json({ error: "AI insights failed: " + err.message });
  }
});

// Start Express server and bind Vite middleware
async function startServer() {
  await ensureDataFolder();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
