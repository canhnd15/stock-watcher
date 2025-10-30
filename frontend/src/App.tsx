import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Trades from "./pages/Trades.tsx";
import TrackedStocks from "./pages/TrackedStocks.tsx";
import Suggestions from "./pages/Suggestions.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import Config from "./pages/Config.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Unauthorized from "./pages/Unauthorized.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
