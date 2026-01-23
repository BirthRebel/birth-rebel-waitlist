import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Auth from "./pages/Auth";
import CaregiverAuth from "./pages/CaregiverAuth";
import CaregiverMatches from "./pages/CaregiverMatches";
import CaregiverProfile from "./pages/CaregiverProfile";
import ParentDashboard from "./pages/ParentDashboard";
import AdminImport from "./pages/AdminImport";
import AdminCaregivers from "./pages/AdminCaregivers";
import AdminMessages from "./pages/AdminMessages";
import AdminParentRequests from "./pages/AdminParentRequests";
import AdminMatches from "./pages/AdminMatches";
import QuoteView from "./pages/QuoteView";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieConsentBanner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/caregiver/auth" element={<CaregiverAuth />} />
          <Route path="/caregiver/profile" element={<CaregiverProfile />} />
          <Route path="/caregiver/matches" element={<CaregiverMatches />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/admin/import" element={<AdminImport />} />
          <Route path="/admin/caregivers" element={<AdminCaregivers />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/parent-requests" element={<AdminParentRequests />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          <Route path="/quote/:quoteId" element={<QuoteView />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
