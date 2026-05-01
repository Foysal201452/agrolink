# AgroLink (Bangla UI)

এই প্রজেক্টটি **Vite + React + TypeScript + Tailwind (shadcn/ui)** দিয়ে তৈরি। এখানে UI/UX টেক্সটগুলো **বাংলা** করা হয়েছে।

## চালানোর নিয়ম

```bash
npm install
npm run dev
```

তারপর ব্রাউজারে `http://localhost:8080` ওপেন করুন।

## ডাটাবেস সহ (SQLite + API Server)

প্রফেসরের কাছে ডেমো দেখানোর জন্য একটি ছোট **SQLite ডাটাবেস** ও **Express API** যোগ করা হয়েছে।

```bash
npm install
npm run dev:all
```

- Frontend: `http://localhost:8080`
- API health: `http://127.0.0.1:5050/api/health`
- Crops API: `http://127.0.0.1:5050/api/crops`
- Bootstrap (সব ডাটা একসাথে): `http://127.0.0.1:5050/api/bootstrap`

নোট:
- প্রথমবার রান করলে `server/data/agrolink.sqlite` অটো তৈরি হবে এবং seed data ঢুকে যাবে।
- Server না চালালে অ্যাপ আগের মতোই local demo data (localStorage) দিয়ে চলবে।

### DB ফিচার (ডেমো)
- **Marketplace crops**: DB থেকে লোড হয়
- **Buyer order list**: Cart থেকে “অর্ডার দিন” দিলে DB তে `orders` + `order_lines` সেভ হয়
- **Logistics tracking**: অর্ডার হলে DB তে `shipments` তৈরি হয়; “পরের ধাপ” দিলে shipment step, order status, warehouse inventory আপডেট হয়

## বিল্ড

```bash
npm run build
npm run preview
```
