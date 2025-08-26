import { useRef } from "react";
import { HeroSection } from "@/components/HeroSection";
import { ProblemStats } from "@/components/ProblemStats";
import { ValueProposition } from "@/components/ValueProposition";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/Footer";

const Index = () => {
  const waitlistRef = useRef<HTMLDivElement>(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <HeroSection onJoinWaitlist={scrollToWaitlist} />
      <ProblemStats />
      <ValueProposition />
      <div ref={waitlistRef}>
        <WaitlistForm />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
