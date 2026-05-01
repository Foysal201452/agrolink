import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import Logistics from "./pages/Logistics.tsx";
import FarmerDashboard from "./pages/FarmerDashboard.tsx";
import BuyerDashboard from "./pages/BuyerDashboard.tsx";
import Cart from "./pages/Cart.tsx";
import DbAdmin from "./pages/DbAdmin.tsx";
import Login from "./pages/Login.tsx";
import Scanner from "./pages/Scanner.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AppStoreProvider } from "@/store/app-store";
import { AuthProvider } from "@/auth/auth";
import { RequireRole } from "@/auth/RequireRole";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route
                path="/logistics"
                element={
                  <RequireRole roles={["admin"]}>
                    <Logistics />
                  </RequireRole>
                }
              />
              <Route
                path="/farmer-dashboard"
                element={
                  <RequireRole roles={["farmer", "admin"]}>
                    <FarmerDashboard />
                  </RequireRole>
                }
              />
              <Route
                path="/buyer-dashboard"
                element={
                  <RequireRole roles={["buyer", "admin"]}>
                    <BuyerDashboard />
                  </RequireRole>
                }
              />
              <Route
                path="/cart"
                element={
                  <RequireRole roles={["buyer"]}>
                    <Cart />
                  </RequireRole>
                }
              />
              <Route
                path="/db-admin"
                element={
                  <RequireRole roles={["admin"]}>
                    <DbAdmin />
                  </RequireRole>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route
                path="/scanner"
                element={
                  <RequireRole roles={["depo", "delivery"]}>
                    <Scanner />
                  </RequireRole>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppStoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
