import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";

interface HeroSectionProps {
  onJoinMailingList: () => void;
}

export const HeroSection = ({ onJoinMailingList }: HeroSectionProps) => {
  return (
    <section className="relative h-full flex items-center justify-center bg-gradient-soft overflow-hidden">
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
          Birth Rebel is a fully virtual maternal care platform — connecting new and expectant mothers 
          with trusted doulas, lactation consultants, sleep consultants, and more.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="hero" 
            size="xl" 
            onClick={() => window.open('https://formless.ai/c/L4iE1bTSHy6C', '_blank')}
            className="animate-pulse hover:animate-none"
          >
            Find Your Maternity Caregiver
          </Button>
          
          <Button 
            variant="outline" 
            size="xl" 
            onClick={onJoinMailingList}
            className="border-2 hover:bg-background/10"
          >
            Join as a Caregiver
          </Button>
        </div>
      </div>
    </section>
  );
};