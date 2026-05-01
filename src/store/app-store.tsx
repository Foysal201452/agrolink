import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { useAuth } from "@/auth/auth";

import avocadoImg from "../images/avocado.jpg";
import bananasImg from "../images/bananas.jpg";
import cornImg from "../images/corn.jpg";
import mangoesImg from "../images/mangoes.jpg";
import peasImg from "../images/peas.jpg";
import potatoesImg from "../images/potatoes.jpg";
import riceImg from "../images/rice.jpg";
import tomatoImg from "../images/tomato.jpg";

export type CropCategoryKey = "Vegetables" | "Fruits" | "Grains";

export type Crop = {
  id: number;
  name: string;
  farmer: string;
  location: string;
  price: number;
  unit: string;
  rating: number;
  harvest: string;
  category: CropCategoryKey;
  image: string;
  active: boolean;
};

export type CartLine = {
  cropId: number;
  qty: number;
};

export type OrderStatusKey = "Processing" | "In Transit" | "Delivered" | "Completed";

export type Order = {
  id: string;
  buyerName: string;
  createdAtMs: number;
  dateLabel: string;
  status: OrderStatusKey;
  lines: Array<{
    cropId: number;
    qty: number;
    snapshot: {
      name: string;
      farmer: string;
      price: number;
      unit: string;
      location: string;
      image: string;
    };
  }>;
};

export type ShipmentStepKey =
  | "Collected"
  | "At Village Hub"
  | "In Transit"
  | "At City Hub"
  | "Out for Delivery"
  | "Delivered";

export type Shipment = {
  id: string;
  orderId: string;
  cargoUnits: number;
  eta: string;
  step: ShipmentStepKey;
  itemsLabel: string;
  route: {
    village: string;
    villageHub: string;
    cityHub: string;
    city: string;
  };
  timeline: Array<{ step: ShipmentStepKey; timeLabel: string }>;
};

export type Warehouse = {
  id: string;
  name: string;
  kind: "village" | "city";
  area: string;
  temp: string;
  maxItems: number;
  items: number;
};

type State = {
  crops: Crop[];
  cart: CartLine[];
  orders: Order[];
  shipments: Shipment[];
  warehouses: Warehouse[];
  buyerName: string;
  buyerArea: "ঢাকা" | "চট্টগ্রাম" | "খুলনা" | "সিলেট";
  farmerName: string;
};

const STORAGE_KEY = "agrolink_state_v3";

const defaultCityWarehouses: Warehouse[] = [
  { id: "CWH-NAI", name: "ঢাকা সিটি হাব", kind: "city", area: "ঢাকা", maxItems: 5000, items: 1240, temp: "4°C" },
  { id: "CWH-CTG", name: "চট্টগ্রাম ডিপো", kind: "city", area: "চট্টগ্রাম", maxItems: 5000, items: 830, temp: "6°C" },
  { id: "CWH-KHL", name: "খুলনা স্টোরেজ", kind: "city", area: "খুলনা", maxItems: 5000, items: 1580, temp: "3°C" },
];

const seedCropImageById: Record<number, string> = {
  1: tomatoImg,
  2: cornImg,
  3: avocadoImg,
  4: peasImg,
  5: mangoesImg,
  6: riceImg,
  7: potatoesImg,
  8: bananasImg,
};

function looksLikeUrlOrPath(v: string) {
  const s = v.trim();
  return /^https?:\/\//i.test(s) || s.startsWith("/") || s.includes(".");
}

function migrateCropImage(crop: Crop): Crop {
  const maybe = seedCropImageById[crop.id];
  if (!maybe) return crop;
  if (typeof crop.image !== "string") return { ...crop, image: maybe };
  // if localStorage still has emoji/label, replace with real seed image
  if (!looksLikeUrlOrPath(crop.image)) return { ...crop, image: maybe };
  return crop;
}

function normalizeVillageName(v: string) {
  return (v || "").trim() || "অজানা গ্রাম";
}

function makeWarehouseId(prefix: string, area: string) {
  const compact = area.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${prefix}-${compact || "x"}`;
}

function ensureVillageWarehouse(warehouses: Warehouse[], village: string) {
  const area = normalizeVillageName(village);
  const id = makeWarehouseId("VWH", area);
  const existing = warehouses.find((w) => w.id === id);
  if (existing) return { warehouses, warehouse: existing };
  const wh: Warehouse = {
    id,
    name: `${area} সংগ্রহ হাব`,
    kind: "village",
    area,
    temp: "সাধারণ",
    maxItems: 1200,
    items: 0,
  };
  return { warehouses: [wh, ...warehouses], warehouse: wh };
}

function pickCityWarehouse(warehouses: Warehouse[]) {
  return warehouses.find((w) => w.kind === "city") ?? warehouses[0];
}

function pickCityWarehouseByArea(warehouses: Warehouse[], area: State["buyerArea"]) {
  return warehouses.find((w) => w.kind === "city" && w.area === area) ?? pickCityWarehouse(warehouses);
}

function normalizeWarehouses(raw: Warehouse[]) {
  return raw.map((w) => {
    const maxItems =
      typeof w.maxItems === "number" && Number.isFinite(w.maxItems) && w.maxItems > 0
        ? w.maxItems
        : w.kind === "city"
          ? 5000
          : 1200;
    const items = typeof w.items === "number" && Number.isFinite(w.items) ? w.items : 0;
    return { ...w, maxItems, items };
  });
}

function capacityPct(_w: Warehouse) {
  // kept for compatibility; UI computes capacity directly
  return 0;
}

const initialCrops: Crop[] = [
  { id: 1, name: "অর্গানিক টমেটো", farmer: "আব্দুল করিম", location: "ঢাকা", price: 120, unit: "kg", rating: 4.8, harvest: "এপ্রি ২০২৬", category: "Vegetables", image: tomatoImg, active: true },
  { id: 2, name: "তাজা ভুট্টা", farmer: "মোছা. রুনা আক্তার", location: "চট্টগ্রাম", price: 80, unit: "kg", rating: 4.5, harvest: "মে ২০২৬", category: "Grains", image: cornImg, active: true },
  { id: 3, name: "অ্যাভোকাডো", farmer: "মো. রাশেদুল ইসলাম", location: "খুলনা", price: 200, unit: "kg", rating: 4.9, harvest: "মার্চ ২০২৬", category: "Fruits", image: avocadoImg, active: true },
  { id: 4, name: "শিম", farmer: "সালমা খাতুন", location: "সিলেট", price: 150, unit: "kg", rating: 4.6, harvest: "এপ্রি ২০২৬", category: "Vegetables", image: peasImg, active: true },
  { id: 5, name: "তাজা আম", farmer: "মো. হাবিবুর রহমান", location: "ঢাকা", price: 100, unit: "kg", rating: 4.7, harvest: "ফেব ২০২৬", category: "Fruits", image: mangoesImg, active: true },
  { id: 6, name: "চাল", farmer: "শাহিনুর রহমান", location: "চট্টগ্রাম", price: 180, unit: "kg", rating: 4.4, harvest: "জুন ২০২৬", category: "Grains", image: riceImg, active: true },
  { id: 7, name: "আলু", farmer: "নাসির উদ্দিন", location: "খুলনা", price: 60, unit: "kg", rating: 4.3, harvest: "এপ্রি ২০২৬", category: "Vegetables", image: potatoesImg, active: true },
  { id: 8, name: "কলা", farmer: "ফারজানা ইয়াসমিন", location: "সিলেট", price: 70, unit: "bunch", rating: 4.5, harvest: "মার্চ ২০২৬", category: "Fruits", image: bananasImg, active: true },
];

function loadState(): Partial<State> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (!Array.isArray(parsed.cart) || !Array.isArray(parsed.orders) || !Array.isArray(parsed.shipments)) return null;
    const crops = Array.isArray(parsed.crops)
      ? (parsed.crops as Crop[]).map((c) => migrateCropImage({ ...c, active: c.active ?? true }))
      : initialCrops;
    const warehouses = Array.isArray(parsed.warehouses) ? normalizeWarehouses(parsed.warehouses as Warehouse[]) : null;
    const orders = (parsed.orders as Order[]).map((o) => {
      const createdAtMs =
        typeof (o as any).createdAtMs === "number" && Number.isFinite((o as any).createdAtMs)
          ? (o as any).createdAtMs
          : Date.now();
      return { ...o, createdAtMs } as Order;
    });

    return {
      cart: parsed.cart as CartLine[],
      orders,
      shipments: parsed.shipments as Shipment[],
      crops,
      warehouses: warehouses ?? defaultCityWarehouses,
      buyerName: typeof parsed.buyerName === "string" && parsed.buyerName.trim() ? parsed.buyerName : "ঢাকা ফ্রেশ মার্কেট",
      buyerArea:
        parsed.buyerArea === "ঢাকা" || parsed.buyerArea === "চট্টগ্রাম" || parsed.buyerArea === "খুলনা" || parsed.buyerArea === "সিলেট"
          ? parsed.buyerArea
          : "ঢাকা",
      farmerName: typeof parsed.farmerName === "string" && parsed.farmerName.trim() ? parsed.farmerName : "আব্দুল করিম",
    };
  } catch {
    return null;
  }
}

function saveState(state: State) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        crops: state.crops,
        cart: state.cart,
        orders: state.orders,
        shipments: state.shipments,
        warehouses: state.warehouses,
        buyerName: state.buyerName,
        buyerArea: state.buyerArea,
        farmerName: state.farmerName,
      }),
    );
  } catch {
    // ignore
  }
}

function makeId(prefix: string) {
  const n = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 1000);
  return `${prefix}-${n}-${rand}`;
}

function formatDateLabel(d: Date) {
  // keep simple and readable without adding i18n libs
  const months = ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুল", "আগ", "সেপ্ট", "অক্ট", "নভে", "ডিসে"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

type Action =
  | { type: "ADD_TO_CART"; cropId: number; qty?: number }
  | { type: "SET_QTY"; cropId: number; qty: number }
  | { type: "REMOVE_LINE"; cropId: number }
  | { type: "CLEAR_CART" }
  | { type: "SET_CROPS"; crops: Crop[] }
  | { type: "SET_ORDERS"; orders: Order[] }
  | { type: "SET_SHIPMENTS"; shipments: Shipment[] }
  | { type: "SET_WAREHOUSES"; warehouses: Warehouse[] }
  | { type: "SET_BUYER_NAME"; buyerName: string }
  | { type: "SET_FARMER_NAME"; farmerName: string }
  | { type: "SET_BUYER_AREA"; buyerArea: State["buyerArea"] }
  | { type: "PLACE_ORDER" }
  | { type: "ADVANCE_ORDER_STATUS"; orderId: string }
  | {
      type: "ADD_LISTING";
      listing: Omit<Crop, "id" | "rating" | "active"> & { rating?: number };
    }
  | { type: "ADVANCE_SHIPMENT_STEP"; shipmentId: string }
  | { type: "DEACTIVATE_LISTING"; cropId: number }
  | { type: "RESET_ALL" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET_ALL":
      return {
        crops: initialCrops,
        cart: [],
        orders: [],
        shipments: [],
        warehouses: defaultCityWarehouses,
        buyerName: "ঢাকা ফ্রেশ মার্কেট",
        buyerArea: "ঢাকা",
        farmerName: "আব্দুল করিম",
      };
    case "ADD_TO_CART": {
      const qty = Math.max(1, Math.floor(action.qty ?? 1));
      const existing = state.cart.find((l) => l.cropId === action.cropId);
      const cart = existing
        ? state.cart.map((l) => (l.cropId === action.cropId ? { ...l, qty: l.qty + qty } : l))
        : [...state.cart, { cropId: action.cropId, qty }];
      return { ...state, cart };
    }
    case "SET_QTY": {
      const qty = Math.max(1, Math.floor(action.qty));
      return { ...state, cart: state.cart.map((l) => (l.cropId === action.cropId ? { ...l, qty } : l)) };
    }
    case "REMOVE_LINE":
      return { ...state, cart: state.cart.filter((l) => l.cropId !== action.cropId) };
    case "CLEAR_CART":
      return { ...state, cart: [] };
    case "SET_CROPS": {
      return { ...state, crops: action.crops };
    }
    case "SET_ORDERS": {
      return { ...state, orders: action.orders };
    }
    case "SET_SHIPMENTS": {
      return { ...state, shipments: action.shipments };
    }
    case "SET_WAREHOUSES": {
      return { ...state, warehouses: action.warehouses };
    }
    case "SET_BUYER_NAME": {
      return { ...state, buyerName: action.buyerName };
    }
    case "SET_FARMER_NAME": {
      return { ...state, farmerName: action.farmerName };
    }
    case "SET_BUYER_AREA": {
      return { ...state, buyerArea: action.buyerArea };
    }
    case "PLACE_ORDER": {
      if (state.cart.length === 0) return state;
      const now = new Date();
      const orderId = makeId("ORD");

      const lines = state.cart
        .map((l) => {
          const crop = state.crops.find((c) => c.id === l.cropId);
          if (!crop) return null;
          return {
            cropId: l.cropId,
            qty: l.qty,
            snapshot: {
              name: crop.name,
              farmer: crop.farmer,
              price: crop.price,
              unit: crop.unit,
              location: crop.location,
              image: crop.image,
            },
          };
        })
        .filter(Boolean) as Order["lines"];

      const order: Order = {
        id: orderId,
        buyerName: state.buyerName,
        createdAtMs: now.getTime(),
        dateLabel: formatDateLabel(now),
        status: "Processing",
        lines,
      };

      const itemsLabel = lines.map((l) => `${l.snapshot.name} (${l.qty}${l.snapshot.unit})`).join(", ");

      const villages = Array.from(new Set(lines.map((l) => l.snapshot.location)));
      const village = villages.length === 1 ? villages[0]! : "বহু গ্রাম";

      // Ensure a village warehouse exists for tracking collection.
      const ensured = ensureVillageWarehouse(state.warehouses, village);
      const warehousesWithVillage = ensured.warehouses;
      const villageWarehouse = ensured.warehouse;
      const cityWarehouse = pickCityWarehouseByArea(warehousesWithVillage, state.buyerArea) ?? villageWarehouse;

      const cargoUnits = Math.max(1, lines.reduce((sum, l) => sum + l.qty, 0));

      const shipment: Shipment = {
        id: makeId("SH"),
        orderId,
        cargoUnits,
        step: "Collected",
        eta: "4h 00m",
        itemsLabel,
        route: {
          village: normalizeVillageName(village),
          villageHub: villageWarehouse.name,
          cityHub: cityWarehouse.name,
          city: `${state.buyerArea} বাজার`,
        },
        timeline: [{ step: "Collected", timeLabel: formatDateLabel(now) }],
      };

      // On "Collected", goods will be moved into village hub once it reaches that step.
      return { ...state, warehouses: warehousesWithVillage, orders: [order, ...state.orders], shipments: [shipment, ...state.shipments], cart: [] };
    }
    case "ADVANCE_ORDER_STATUS": {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order) return state;
      const next: OrderStatusKey =
        order.status === "Processing" ? "In Transit" :
        order.status === "In Transit" ? "Delivered" :
        order.status === "Delivered" ? "Completed" :
        "Completed";
      return { ...state, orders: state.orders.map((o) => (o.id === action.orderId ? { ...o, status: next } : o)) };
    }
    case "ADD_LISTING": {
      const nextId = Math.max(0, ...state.crops.map((c) => c.id)) + 1;
      const crop: Crop = {
        id: nextId,
        rating: action.listing.rating ?? 4.5,
        ...action.listing,
        active: true,
      };
      return { ...state, crops: [crop, ...state.crops] };
    }
    case "DEACTIVATE_LISTING": {
      return { ...state, crops: state.crops.map((c) => (c.id === action.cropId ? { ...c, active: false } : c)) };
    }
    case "ADVANCE_SHIPMENT_STEP": {
      const shipment = state.shipments.find((s) => s.id === action.shipmentId);
      if (!shipment) return state;
      const next: ShipmentStepKey =
        shipment.step === "Collected" ? "At Village Hub" :
        shipment.step === "At Village Hub" ? "In Transit" :
        shipment.step === "In Transit" ? "At City Hub" :
        shipment.step === "At City Hub" ? "Out for Delivery" :
        shipment.step === "Out for Delivery" ? "Delivered" :
        "Delivered";

      const now = new Date();
      const shipments = state.shipments.map((s) =>
        s.id === action.shipmentId
          ? {
              ...s,
              step: next,
              eta: next === "Delivered" ? "—" : s.eta,
              timeline: [...s.timeline, { step: next, timeLabel: formatDateLabel(now) }],
            }
          : s,
      );

      // Link order progression (demo): first non-final order moves with shipment
      let orders = state.orders;
      const target = state.orders.find((o) => o.id === shipment.orderId);
      if (target) {
        const nextOrderStatus: OrderStatusKey =
          next === "At Village Hub" ? "Processing" :
          next === "In Transit" || next === "At City Hub" || next === "Out for Delivery" ? "In Transit" :
          next === "Delivered" ? "Delivered" :
          "Processing";
        orders = state.orders.map((o) => (o.id === target.id ? { ...o, status: nextOrderStatus } : o));
      }

      // Warehouse sync: village hub <-> city hub stock movement (demo, unit-based)
      let warehouses = state.warehouses;
      const delta = shipment.cargoUnits;
      const villageId = makeWarehouseId("VWH", shipment.route.village);
      const city = state.warehouses.find((w) => w.name === shipment.route.cityHub);
      const cityId = city?.id;

      const bump = (w: Warehouse, add: number) => ({ ...w, items: Math.max(0, w.items + add) });

      if (next === "At Village Hub") {
        // Collected goods arrive at village warehouse
        warehouses = warehouses.map((w) => (w.id === villageId ? bump(w, +delta) : w));
      } else if (next === "In Transit") {
        // Leaving village hub
        warehouses = warehouses.map((w) => (w.id === villageId ? bump(w, -delta) : w));
      } else if (next === "At City Hub" && cityId) {
        // Arrive at city hub
        warehouses = warehouses.map((w) => (w.id === cityId ? bump(w, +delta) : w));
      } else if (next === "Out for Delivery" && cityId) {
        // Going out from city hub
        warehouses = warehouses.map((w) => (w.id === cityId ? bump(w, -delta) : w));
      }

      return { ...state, shipments, orders, warehouses };
    }
    default:
      return state;
  }
}

const AppStoreContext = createContext<{
  state: State;
  addToCart: (cropId: number, qty?: number) => void;
  setQty: (cropId: number, qty: number) => void;
  removeLine: (cropId: number) => void;
  clearCart: () => void;
  placeOrder: () => Promise<void>;
  setBuyerName: (buyerName: string) => void;
  setFarmerName: (farmerName: string) => void;
  setBuyerArea: (buyerArea: State["buyerArea"]) => void;
  advanceOrderStatus: (orderId: string) => void;
  addListing: (listing: Omit<Crop, "id" | "rating" | "active"> & { rating?: number }) => Promise<void>;
  deactivateListing: (cropId: number) => Promise<void>;
  advanceShipmentStep: (shipmentId: string) => Promise<void>;
  resetAll: () => void;
  derived: {
    cartCount: number;
    cartTotal: number;
    cartLinesDetailed: Array<{ crop: Crop; qty: number; lineTotal: number }>;
    ordersDetailed: Array<{
      order: Order;
      itemsLabel: string;
      total: number;
      farmerNames: string;
    }>;
  };
} | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { auth, authFetch } = useAuth();
  const persisted = typeof window !== "undefined" ? loadState() : null;
  const [state, dispatch] = useReducer(reducer, {
    crops: persisted?.crops ?? initialCrops,
    cart: persisted?.cart ?? [],
    orders: persisted?.orders ?? [],
    shipments: persisted?.shipments ?? [],
    warehouses: persisted?.warehouses ?? defaultCityWarehouses,
    buyerName: persisted?.buyerName ?? "ঢাকা ফ্রেশ মার্কেট",
    buyerArea: persisted?.buyerArea ?? "ঢাকা",
    farmerName: persisted?.farmerName ?? "আব্দুল করিম",
  } satisfies State);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/bootstrap");
        if (!res.ok) return;
        const data = (await res.json()) as {
          crops?: Crop[];
          orders?: Order[];
          shipments?: Shipment[];
          warehouses?: Warehouse[];
        };
        if (cancelled) return;
        if (Array.isArray(data.crops) && data.crops.length > 0) dispatch({ type: "SET_CROPS", crops: data.crops });
        if (Array.isArray(data.orders)) dispatch({ type: "SET_ORDERS", orders: data.orders });
        if (Array.isArray(data.shipments)) dispatch({ type: "SET_SHIPMENTS", shipments: data.shipments });
        if (Array.isArray(data.warehouses) && data.warehouses.length > 0) dispatch({ type: "SET_WAREHOUSES", warehouses: data.warehouses });
      } catch {
        // ignore (offline demo mode)
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const derived = useMemo(() => {
    const cartLinesDetailed = state.cart
      .map((l) => {
        const crop = state.crops.find((c) => c.id === l.cropId);
        if (!crop) return null;
        return { crop, qty: l.qty, lineTotal: l.qty * crop.price };
      })
      .filter(Boolean) as Array<{ crop: Crop; qty: number; lineTotal: number }>;

    const cartCount = state.cart.reduce((sum, l) => sum + l.qty, 0);
    const cartTotal = cartLinesDetailed.reduce((sum, l) => sum + l.lineTotal, 0);

    const ordersDetailed = state.orders.map((order) => {
      const itemsLabel = order.lines.map((l) => `${l.snapshot.name} (${l.qty}${l.snapshot.unit})`).join(", ");
      const total = order.lines.reduce((sum, l) => sum + l.qty * l.snapshot.price, 0);
      const farmerNames = Array.from(new Set(order.lines.map((l) => l.snapshot.farmer))).join(", ");
      return { order, itemsLabel, total, farmerNames };
    });

    return { cartCount, cartTotal, cartLinesDetailed, ordersDetailed };
  }, [state.cart, state.crops, state.orders]);

  const value = useMemo(() => {
    return {
      state,
      addToCart: (cropId: number, qty?: number) => dispatch({ type: "ADD_TO_CART", cropId, qty }),
      setQty: (cropId: number, qty: number) => dispatch({ type: "SET_QTY", cropId, qty }),
      removeLine: (cropId: number) => dispatch({ type: "REMOVE_LINE", cropId }),
      clearCart: () => dispatch({ type: "CLEAR_CART" }),
      placeOrder: async () => {
        if (state.cart.length === 0) return;
        try {
          const res = await authFetch("/api/orders", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ buyerName: state.buyerName, buyerArea: state.buyerArea, cart: state.cart }),
          });
          if (!res.ok) throw new Error("create order failed");
          const data = (await res.json()) as { order?: Order; shipment?: Shipment };
          if (data.order && data.shipment) {
            dispatch({ type: "SET_ORDERS", orders: [data.order, ...state.orders] });
            dispatch({ type: "SET_SHIPMENTS", shipments: [data.shipment, ...state.shipments] });
            dispatch({ type: "CLEAR_CART" });
            return;
          }
        } catch {
          // fallback: local demo mode
        }
        dispatch({ type: "PLACE_ORDER" });
      },
      setBuyerName: (buyerName: string) => dispatch({ type: "SET_BUYER_NAME", buyerName }),
      setFarmerName: (farmerName: string) => dispatch({ type: "SET_FARMER_NAME", farmerName }),
      setBuyerArea: (buyerArea: State["buyerArea"]) => dispatch({ type: "SET_BUYER_AREA", buyerArea }),
      advanceOrderStatus: (orderId: string) => dispatch({ type: "ADVANCE_ORDER_STATUS", orderId }),
      addListing: async (listing: Omit<Crop, "id" | "rating" | "active"> & { rating?: number }) => {
        try {
          const res = await authFetch("/api/crops", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(listing),
          });
          if (!res.ok) throw new Error("create failed");
          const data = (await res.json()) as { crop?: Crop };
          if (data.crop) {
            dispatch({ type: "SET_CROPS", crops: [data.crop, ...state.crops] });
            return;
          }
        } catch {
          // fallback: local demo mode
        }
        dispatch({ type: "ADD_LISTING", listing });
      },
      deactivateListing: async (cropId: number) => {
        try {
          const res = await authFetch(`/api/crops/${cropId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ active: false }),
          });
          if (!res.ok) throw new Error("update failed");
          const data = (await res.json()) as { crop?: Crop };
          if (data.crop) {
            dispatch({
              type: "SET_CROPS",
              crops: state.crops.map((c) => (c.id === cropId ? data.crop! : c)),
            });
            return;
          }
        } catch {
          // fallback: local demo mode
        }
        dispatch({ type: "DEACTIVATE_LISTING", cropId });
      },
      advanceShipmentStep: async (shipmentId: string) => {
        try {
          const res = await authFetch(`/api/shipments/${shipmentId}/advance`, { method: "POST" });
          if (!res.ok) throw new Error("advance failed");
          const data = (await res.json()) as { shipment?: Shipment; order?: Order; warehouses?: Warehouse[] };
          if (data.shipment) {
            dispatch({
              type: "SET_SHIPMENTS",
              shipments: state.shipments.map((s) => (s.id === shipmentId ? data.shipment! : s)),
            });
          }
          if (data.order) {
            dispatch({
              type: "SET_ORDERS",
              orders: state.orders.map((o) => (o.id === data.order!.id ? { ...o, status: data.order!.status } : o)),
            });
          }
          if (Array.isArray(data.warehouses)) dispatch({ type: "SET_WAREHOUSES", warehouses: data.warehouses });
          if (data.shipment || data.order || data.warehouses) return;
        } catch {
          // fallback: local demo mode
        }
        dispatch({ type: "ADVANCE_SHIPMENT_STEP", shipmentId });
      },
      resetAll: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        dispatch({ type: "RESET_ALL" });
      },
      derived,
    };
  }, [state, derived, authFetch]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

