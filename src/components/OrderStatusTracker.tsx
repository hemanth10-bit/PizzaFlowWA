import React from "react";
import { Order } from "../types";
import { Clock, CheckCircle, Flame, ShoppingBag, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
interface OrderStatusTrackerProps {
  order: Order;
  onRefresh: () => void;
  onClose: () => void;
}
export default function OrderStatusTracker({ order, onRefresh, onClose }: OrderStatusTrackerProps) {
  const statuses = [
    { key: "pending", label: "Order Placed", desc: "Rajan's kitchen is verifying your order", icon: ShoppingBag, color: "bg-cheese-500" },
    { key: "preparing", label: "In the Oven", desc: "Chef is spinning the dough and baking your pizza", icon: Flame, color: "bg-tomato-500" },
    { key: "ready", label: "Ready at Counter", desc: "Sizzling hot and packaged! Please collect it", icon: Clock, color: "bg-blue-500" },
    { key: "completed", label: "Collected", desc: "Enjoy your delicious slice of SliceMatic pizza!", icon: CheckCircle, color: "bg-basil-500" },
  ];
  const currentIdx = statuses.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-white rounded-3xl shadow-xl border border-warm-200 overflow-hidden max-w-lg w-full mx-auto"
      id="order-tracker-container"
    >
      {/* Header Banner */}
      <div className="bg-tomato-600 p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors cursor-pointer"
          title="Close Tracker"
          id="btn-close-tracker"
        >
          &times;
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-tomato-100 font-mono tracking-wider">REAL-TIME TRACKING</p>
            <h3 className="text-xl font-bold font-display leading-tight">{order.id}</h3>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Customer Details */}
        <div className="bg-warm-50 rounded-xl p-4 mb-6 flex flex-col gap-1.5 border border-warm-200">
          <div className="flex justify-between items-center text-xs text-warm-500 font-mono">
            <span>CUSTOMER</span>
            <span>PHONE</span>
          </div>
          <div className="flex justify-between items-center text-sm font-semibold text-crust-800">
            <span>{order.customerName}</span>
            <span>+91 {order.customerPhone}</span>
          </div>
          <div className="h-[1px] bg-warm-200 my-1"></div>
          <div className="flex justify-between items-center text-xs text-warm-500">
            <span>Mode: <strong className="text-crust-600">{order.paymentMode}</strong></span>
            <span>Placed: <strong className="text-crust-600">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
          </div>
        </div>
        {/* Live Status Flow */}
        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100 text-rose-700 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Order Cancelled</h4>
              <p className="text-xs opacity-90">This order has been cancelled by the kitchen staff.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-warm-100 mb-6">
            {statuses.map((status, index) => {
              const Icon = status.icon;
              const isPast = index < currentIdx;
              const isCurrent = index === currentIdx;
              const isFuture = index > currentIdx;
              return (
                <div key={status.key} className="flex gap-4 relative">
                  {/* Status Node */}
                  <div className="relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isPast
                          ? "bg-basil-500 text-white shadow-md"
                          : isCurrent
                          ? `${status.color} text-white ring-4 ring-tomato-100 shadow-md animate-pulse`
                          : "bg-warm-100 text-warm-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  {/* Status Label */}
                  <div className="flex-1 pt-0.5">
                    <h4
                      className={`text-sm font-bold ${
                        isCurrent
                          ? "text-crust-900"
                          : isPast
                          ? "text-crust-600 font-medium"
                          : "text-warm-400"
                      }`}
                    >
                      {status.label}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isCurrent ? "text-crust-600 font-medium" : "text-warm-400"}`}>
                      {status.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Itemized Order Summary */}
        <div className="border-t border-warm-200 pt-5 space-y-3">
          <h4 className="text-xs font-bold text-warm-400 font-mono tracking-wider uppercase">ORDER SUMMARY</h4>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div>
                  <span className="font-bold text-crust-800">{item.quantity}x</span>{" "}
                  <span className="font-medium text-crust-800">{item.pizzaName}</span>{" "}
                  <span className="text-xs text-warm-500 font-mono">({item.size})</span>
                  <div className="text-xs text-warm-400 pl-5">
                    Crust: {item.baseName}
                    {item.toppings.length > 0 && ` • Toppings: ${item.toppings.join(", ")}`}
                  </div>
                </div>
                <span className="font-mono text-crust-600 font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="bg-warm-50 rounded-xl p-3 space-y-1.5 mt-2 text-xs font-mono border border-warm-200/60">
            <div className="flex justify-between text-warm-500">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-basil-600 font-semibold">
                <span>10% Quantity Discount</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-warm-500">
              <span>GST (18%)</span>
              <span>₹{order.gst}</span>
            </div>
            <div className="h-[1px] bg-warm-200 my-1"></div>
            <div className="flex justify-between text-sm font-bold text-crust-800">
              <span>Total Bill</span>
              <span>₹{order.total}</span>
            </div>
          </div>
        </div>
        {/* Actions Footer */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onRefresh}
            className="flex-1 flex items-center justify-center gap-2 border border-warm-200 hover:border-warm-400 hover:bg-warm-50 text-crust-600 font-semibold text-sm py-2.5 px-4 rounded-full transition-all shadow-xs active:scale-95 cursor-pointer"
            id="btn-refresh-tracker"
          >
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
            Refresh Status
          </button>
        </div>
      </div>
    </motion.div>
  );
}
