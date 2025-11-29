import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { QuoteSection } from "@/components/QuoteSection";
import { HowItWorks } from "@/components/HowItWorks";
import { CaregiverCTA } from "@/components/CaregiverCTA";
import { ValueProposition } from "@/components/ValueProposition";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="overflow-y-auto">
      <Header />
      <section className="h-screen">
        <HeroSection />
      </section>
      
      <section>
        <QuoteSection />
      </section>
      
      <section>
        <HowItWorks />
      </section>
      
      <section>
        <CaregiverCTA />
      </section>
      
      <section className="min-h-screen">
        <ValueProposition />
      </section>
      
      <footer>
        <Footer />
      </footer>
    </div>
  );
};

export default Index;
