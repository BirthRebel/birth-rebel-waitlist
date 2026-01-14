import { Button } from "@/components/ui/button";
import waterbirthHero from "@/assets/waterbirth-hero.jpg";

export const HeroSection = () => {
  
  return (
    <section 
      className="relative h-full flex items-center justify-center overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${waterbirthHero})` }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight text-white">
          Rebuilding Trust in{" "}
          <span className="text-white">
            Maternal Care
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed text-white/90">
          Birth Rebel is a fully virtual maternal care platform — connecting new and expectant mothers 
          with trusted doulas, lactation consultants, sleep consultants, and more.
        </p>
        
        <div className="mb-8 max-w-2xl mx-auto">
          <p className="text-lg md:text-xl text-white/90">
            Click the button below to connect with a caregiver. We'll ask you a few questions which will take about 5 minutes. This will help us to understand what you are looking for. Our current roster includes doulas, lactation consultants, hypnobirthing teachers and sleep experts.
          </p>
        </div>
        
        <Button 
          className="bg-[#E2725B] text-white hover:bg-[#E2725B]/90 shadow-glow transform hover:scale-105"
          size="xl" 
          onClick={() => window.open('https://formless.ai/c/L4iE1bTSHy6C', '_blank')}
        >
          Find Your Maternity Caregiver
        </Button>
      </div>
    </section>
  );
};