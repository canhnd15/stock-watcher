import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import FloatingChatWidget from "@/components/FloatingChatWidget.tsx";
import Trades from "./pages/Trades.tsx";
import TrackedStocks from "./pages/TrackedStocks.tsx";
import Suggestions from "./pages/Suggestions.tsx";
import PriceAlerts from "./pages/PriceAlerts.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import Config from "./pages/Config.tsx";
import Chat from "./pages/Chat.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Unauthorized from "./pages/Unauthorized.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes - all authenticated users */}
            <Route path="/" element={
              <ProtectedRoute>
                <Trades />
              </ProtectedRoute>
            } />
            
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            
            {/* Protected routes - VIP and ADMIN only */}
            <Route path="/tracked" element={
              <ProtectedRoute requiredRoles={['VIP', 'ADMIN']}>
                <TrackedStocks />
              </ProtectedRoute>
            } />
            
            <Route path="/suggestions" element={
              <ProtectedRoute requiredRoles={['VIP', 'ADMIN']}>
                <Suggestions />
              </ProtectedRoute>
            } />
            
            <Route path="/price-alerts" element={
              <ProtectedRoute requiredRoles={['VIP', 'ADMIN']}>
                <PriceAlerts />
              </ProtectedRoute>
            } />
            
            {/* Protected routes - ADMIN only */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            
            <Route path="/config" element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <Config />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            <FloatingChatWidget />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
