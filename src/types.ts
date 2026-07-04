export interface PizzaBase {
  name: string;
  price: number;
  description: string;
}

export interface Pizza {
  name: string;
  price: number;
  description: string;
  category: "Veg" | "Non-Veg";
}

export interface Topping {
  name: string;
  price: number;
  category: "Veg" | "Non-Veg";
}

export interface OrderItem {
  pizzaName: string;
  baseName: string;
  size: "Small" | "Medium" | "Large";
  toppings: string[];
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  timestamp: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  paymentMode: "Cash" | "Card" | "UPI";
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
}

export interface InventoryPurchase {
  ingredient: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
  suggestedIncreasePercentage: number;
}

export interface PizzaForecast {
  name: string;
  predictedVolumeNextWeek: number;
  trend: "up" | "down" | "stable";
}

export interface ForecastResult {
  summary: string;
  recommendedInventoryPurchases: InventoryPurchase[];
  peakHoursForecast: string;
  pizzasDemandForecast: PizzaForecast[];
}

export interface BusinessInsight {
  title: string;
  metric: string;
  description: string;
}
