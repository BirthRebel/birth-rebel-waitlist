import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import ParentIntake from "./pages/ParentIntake";
import Auth from "./pages/Auth";
import CaregiverAuth from "./pages/CaregiverAuth";
import CaregiverMatches from "./pages/CaregiverMatches";
import ParentDashboard from "./pages/ParentDashboard";
import AdminImport from "./pages/AdminImport";
import AdminCaregivers from "./pages/AdminCaregivers";
import AdminMessages from "./pages/AdminMessages";
import AdminParentRequests from "./pages/AdminParentRequests";
import AdminMatches from "./pages/AdminMatches";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/find-caregiver" element={<ParentIntake />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/caregiver/auth" element={<CaregiverAuth />} />
          <Route path="/caregiver/matches" element={<CaregiverMatches />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/admin/import" element={<AdminImport />} />
          <Route path="/admin/caregivers" element={<AdminCaregivers />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/parent-requests" element={<AdminParentRequests />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
