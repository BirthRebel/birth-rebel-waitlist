import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import ParentIntake from "./pages/ParentIntake";
import CaregiverAuth from "./pages/CaregiverAuth";
import CaregiverOnboarding from "./pages/CaregiverOnboarding";
import CaregiverMatches from "./pages/CaregiverMatches";
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
          <Route path="/caregiver/auth" element={<CaregiverAuth />} />
          <Route path="/caregiver/onboarding" element={<CaregiverOnboarding />} />
          <Route path="/caregiver/matches" element={<CaregiverMatches />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
