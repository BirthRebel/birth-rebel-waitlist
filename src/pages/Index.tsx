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
    <div className="min-h-screen">
      <HeroSection onJoinMailingList={scrollToMailingList} />
...
      <ValueProposition />
      <div ref={mailingListRef}>
        <WaitlistForm />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
