import { useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import { ProblemStats } from "@/components/ProblemStats";
import { SolutionStats } from "@/components/SolutionStats";
import { ValueProposition } from "@/components/ValueProposition";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";

const Index = () => {
  const mailingListRef = useRef<HTMLDivElement>(null);

  const scrollToMailingList = () => {
    mailingListRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
      <section className="h-screen snap-start">
        <HeroSection onJoinMailingList={scrollToMailingList} />
      </section>
      
      <section className="min-h-screen snap-start" ref={mailingListRef}>
        <WaitlistForm />
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
