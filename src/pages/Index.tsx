import { HeroSection } from "@/components/HeroSection";
import { ProblemStats } from "@/components/ProblemStats";
import { SolutionStats } from "@/components/SolutionStats";
import { ValueProposition } from "@/components/ValueProposition";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
      <section className="h-screen snap-start">
        <HeroSection />
      </section>
      
      <section className="min-h-screen snap-start">
        <ProblemStats />
      </section>
      
      <section className="min-h-screen snap-start">
        <SolutionStats />
      </section>
      
      <section className="min-h-screen snap-start">
        <ValueProposition />
      </section>
      
      <footer className="snap-start">
        <Footer />
      </footer>
    </div>
  );
};

export default Index;
