import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";

interface HeroSectionProps {
  onJoinWaitlist: () => void;
}

export const HeroSection = ({ onJoinWaitlist }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-soft overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Birth Rebel maternal care platform" 
          className="w-full h-full object-cover opacity-10"
        />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
          Rebuilding Trust in{" "}
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            Maternal Care
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Birth Rebel is a fully virtual maternal care marketplace — connecting mothers 
          with trusted doulas, lactation consultants, sleep consultants, and more.
        </p>
        
        <Button 
          variant="hero" 
          size="xl" 
          onClick={onJoinWaitlist}
          className="animate-pulse hover:animate-none"
        >
          Join the Waitlist
        </Button>
      </div>
    </section>
  );
};