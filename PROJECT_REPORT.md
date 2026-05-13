# AgroLink: Web-Based Agricultural Marketplace Platform  
**Final Project Report**

**Course:** *[Insert course code and title]*  
**Institution:** *[Insert institution name]*  
**Submission date:** 13 May 2026  

**Team members**  
| Name | Student ID |
|------|------------|
| Tahia Zaima | 23524202133 |
| Farhan Israq Jami | 23524202103 |
| Mehedi Hasan Foysal | 23524202119 |

---

## Table of Contents

1. [Introduction](#1-introduction)  
2. [Project Idea](#2-project-idea)  
3. [Features of the Project](#3-features-of-the-project)  
4. [Design of the Project](#4-design-of-the-project)  
5. [Development of the Project](#5-development-of-the-project)  
6. [Overview of the Project](#6-overview-of-the-project)  
7. [Contribution](#7-contribution)  
8. [References](#8-references)  

---

## 1. Introduction

Modern agricultural value chains depend on transparent connections among farmers, buyers, and logistics actors. **AgroLink** is a web application that demonstrates such a connection through a Bangla-language user interface and role-based workflows. This report documents the original concept, functional scope, interface design, implementation approach, and individual contributions of a three-member development team. The submitted system combines a responsive single-page client with an optional REST API and SQLite database for a realistic classroom demonstration.

---

## 2. Project Idea

The **submitted project idea** is to design and implement **AgroLink**, a digital **agricultural marketplace and logistics coordination** prototype aimed at a Bangladeshi context. The application presents crop listings, supports buyer purchasing flows, provides farmer-oriented visibility, and illustrates post-order **logistics tracking** and **field scanning** roles for depot and delivery staff. The interface prioritises **Bangla (Bengali) UI text** so that non-English-speaking users can navigate the concept comfortably. A lightweight **server and database layer** was included so that the demonstration is not limited to ephemeral browser-only data, while still allowing offline-style behaviour when the API is not running.

---

## 3. Features of the Project

The principal features implemented in AgroLink include the following.

| Area | Description |
|------|-------------|
| **Public landing experience** | A structured home page with hero, feature highlights, stakeholder narrative, and technology overview in Bangla. |
| **Marketplace** | Browsing of crop listings with metadata such as price, unit, farmer, location, and category. |
| **Authentication** | User login and registration with role assignment (e.g., buyer, farmer), backed by server-side users and session tokens when the API is active. |
| **Buyer workflow** | Shopping cart, order placement, and buyer dashboard views aligned with order state. |
| **Farmer workflow** | Farmer dashboard for supply-side monitoring and management-oriented views. |
| **Logistics and administration** | Logistics views for administrators, including shipment progression; database administration screen for inspection of persisted data. |
| **Scanner (field roles)** | Interface for depot/delivery-style roles to support demonstration of scan-based handoff in the chain. |
| **Persistence** | SQLite storage for crops, orders, order lines, shipments, warehouses, users, and related entities, exposed through HTTP JSON endpoints. |
| **Resilient demo mode** | Client-side state persistence so that core flows remain demonstrable when the backend is not started. |

---

## 4. Design of the Project

### 4.1 Architectural design

The solution follows a **client–server** pattern. The **client** is a **single-page application (SPA)** built with **React** and **TypeScript**, bundled by **Vite**. **React Router** provides client-side navigation. Global application state for marketplace entities is managed through a **React Context** and reducer pattern in the application store module. **Authentication state** is maintained in a dedicated auth context with **localStorage** persistence for the session token and user profile.

The **server** is a **Node.js** application using **Express**, which exposes resources under **`/api/...`**. In development, the Vite development server **proxies** browser requests from `/api` to the Express process so that the team can call relative URLs without cross-origin configuration issues. **SQLite** is used as an embedded database, accessed via **better-sqlite3**, with schema creation and migrations defined alongside the database access layer.

### 4.2 User interface and experience design

The visual layer uses **Tailwind CSS** for layout, spacing, and responsive behaviour. Reusable **interface primitives** (buttons, cards, dialogs, tables, navigation patterns) are organised under a **component library** directory consistent with the **shadcn/ui** pattern built on **Radix UI** primitives. This approach improves **accessibility** (keyboard and focus behaviour) and **consistency** across pages. The **navigation bar** adapts links according to the authenticated user’s **role** (e.g., buyer sees cart and buyer dashboard; administrator sees logistics and database tools).

### 4.3 Security design (demonstration scope)

**Route guards** on the client (`RequireRole`) restrict which screens each role can open in the browser. The report notes explicitly that **server-side authorisation** on each protected API route is the correct production standard; the current implementation is sized for **course demonstration** and documented limitations should be discussed in oral examination if required.

---

## 5. Development of the Project

Implementation proceeded in parallel after agreeing on the information architecture and role model. The **landing and global layout** were implemented first so that navigation and branding were stable for all subsequent feature pages. **Feature routes** were registered centrally, and each major user journey was assigned to a dedicated **page component** under `src/pages`. **Global domain state** (crops, cart, orders, shipments, warehouses) was centralised to avoid duplicated logic across screens. The **Express API** and **SQLite schema** were implemented with typed row models and **request validation** using **Zod** to reduce invalid writes. **Authentication** endpoints issue **bearer tokens** stored by the client and attached to subsequent requests. **Integration testing** of the full stack used `npm run dev:all` to run the API watcher and the Vite dev server together. **Quality tooling** included **ESLint** and **Vitest** for static analysis and unit testing respectively. The **README** was maintained as the authoritative runbook for markers and peers.

**Table 1.** Tools, languages, and software used for development.

| Category | Tool / technology | Purpose |
|----------|-------------------|---------|
| Language | TypeScript | Type-safe frontend and backend code |
| Language | HTML / CSS (via Tailwind) | Structure and styling |
| UI library | React 18 | Component-based user interface |
| Build tool | Vite 5 | Dev server, HMR, production bundling |
| Routing | React Router 6 | SPA routes and navigation |
| Styling | Tailwind CSS 3 | Utility-first responsive layout |
| Components | Radix UI, shadcn-style `ui` folder | Accessible primitives and patterns |
| Client state | React Context + reducer (`app-store`) | Global marketplace state |
| Server state / cache | TanStack React Query | Data fetching patterns where used |
| HTTP server | Express 5 | REST API |
| Database | SQLite (`better-sqlite3`) | Persistent relational storage |
| Validation | Zod | Request and payload validation on API |
| Auth (client) | Custom `AuthProvider` | Login, token storage, `authFetch` |
| Animation | Framer Motion | Transitions (e.g., mobile navigation) |
| Icons | Lucide React | Iconography |
| Forms | React Hook Form, Hookform Resolvers | Form handling (where applicable) |
| Runtime (server) | `tsx` | Execute TypeScript server in dev/prod-style start |
| Concurrency | `concurrently` | Run API and web dev scripts together |
| Version control | Git | Source history and collaboration |
| Editor / IDE | *[e.g., Visual Studio Code]* | Development environment |

*[Replace bracketed rows with your actual course name, institution, and IDE if required.]*

---

## 6. Overview of the Project

This section should contain **screenshots** of the running application. Capture them after `npm install` and `npm run dev` (frontend only) or `npm run dev:all` (frontend + API), then insert the images in a word processor with captions as below.

| Figure | Suggested capture | Suggested caption |
|--------|-------------------|-------------------|
| **Figure 1** | Browser at `/` (full page or above-the-fold) | AgroLink landing page with Bangla hero and primary navigation. |
| **Figure 2** | `/marketplace` showing crop cards | Marketplace listing view. |
| **Figure 3** | Logged-in **buyer**: `/cart` or `/buyer-dashboard` | Buyer workflow: cart or order history. |
| **Figure 4** | Logged-in **farmer**: `/farmer-dashboard` | Farmer dashboard view. |
| **Figure 5** | Logged-in **admin**: `/logistics` or `/db-admin` | Logistics tracking or database administration (API running). |
| **Figure 6** | `/login` | Login and authentication entry screen. |

*[Insert each screenshot immediately below its caption when preparing the final PDF.]*

---

## 7. Contribution

Team responsibilities were divided by layer so that deliverables did not overlap redundantly. Individual contributions are summarised in **Table 2**.

**Table 2.** Member contributions.

| Name | Student ID | Contribution |
|------|------------|--------------|
| **Tahia Zaima** | 23524202133 | Led **product and interface (UI/UX)**: composition of the **landing page** (`Index.tsx`), **Bangla marketing sections** (hero, features, stakeholders, tech stack, footer), **visual consistency** through **Tailwind** and shared **`components/ui`** primitives, **responsive layout** and styling polish, and **navbar presentation** (layout, mobile menu behaviour, branding). Coordinated with teammates so that navigation labels matched agreed routes. |
| **Farhan Israq Jami** | 23524202103 | Led **application flows and client logic**: **React Router** configuration in **`App.tsx`**, implementation and wiring of **feature pages** (marketplace, cart, buyer/farmer dashboards, logistics, scanner, not found), **`RequireRole`** route protection for role-based access, **centralised domain state** in **`app-store`** (cart, orders, shipments, warehouses, persistence), and shared helpers (**`money`**, **`utils`**). Ensured user journeys remained coherent with and without the backend running. |
| **Mehedi Hasan Foysal** | 23524202119 | Led **data, API, and authentication**: **Express** REST API in **`server/index.ts`**, **SQLite** schema and access in **`server/db.ts`**, **session/token** handling and **auth endpoints**, **`authFetch`** / **`AuthProvider`** integration on the client, **`Login`** / **`DbAdmin`** flows, **Vite `/api` proxy** configuration, **`README`** and **`package.json`** scripts (**`dev:all`**, start/build). Documented API URLs and database bootstrap for deployment-style demos. |

---

## 8. References

1. React Documentation. *React — A JavaScript library for building user interfaces.* Available at: https://react.dev/  
2. Vite Documentation. *Next Generation Frontend Tooling.* Available at: https://vitejs.dev/  
3. Tailwind CSS Documentation. *Rapidly build modern websites.* Available at: https://tailwindcss.com/docs  
4. Express Documentation. *Fast, unopinionated, minimalist web framework for Node.js.* Available at: https://expressjs.com/  
5. SQLite Documentation. *Small. Fast. Reliable.* Available at: https://www.sqlite.org/docs.html  

---

*End of report.*
