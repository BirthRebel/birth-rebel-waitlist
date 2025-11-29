import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";

export const HeroSection = () => {
  return (
    <section className="relative h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#9CAF88' }}>
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Birth Rebel maternal care platform" 
          className="w-full h-full object-cover opacity-10"
        />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight">
          Rebuilding Trust in{" "}
          <span className="text-primary">
            Maternal Care
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Birth Rebel is a fully virtual maternal care platform — connecting new and expectant mothers 
          with trusted doulas, lactation consultants, sleep consultants, and more.
        </p>
        
        <div className="mb-8 max-w-2xl mx-auto">
          <p className="text-2xl md:text-3xl font-semibold text-primary mb-3">
            We're in pilot
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            We're building out the full platform, but in the meantime you can use our AI-powered matching tool to connect with trusted caregivers.
          </p>
        </div>
        
        <Button 
          variant="hero" 
          size="xl" 
          onClick={() => window.open('https://formless.ai/c/L4iE1bTSHy6C', '_blank')}
        >
          Find Your Maternity Caregiver
        </Button>
      </div>
    </section>
  );
};