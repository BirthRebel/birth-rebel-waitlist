import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section className="relative h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#9CAF88' }}>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight" style={{ color: '#DED9CD' }}>
          Rebuilding Trust in{" "}
          <span style={{ color: '#DED9CD' }}>
            Maternal Care
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed" style={{ color: '#36454F' }}>
          Birth Rebel is a fully virtual maternal care platform — connecting new and expectant mothers 
          with trusted doulas, lactation consultants, sleep consultants, and more.
        </p>
        
        <div className="mb-8 max-w-2xl mx-auto">
          <p className="text-2xl md:text-3xl font-semibold mb-3" style={{ color: '#DED9CD' }}>
            We're in pilot
          </p>
          <p className="text-lg md:text-xl" style={{ color: '#36454F' }}>
            We're building out the full platform, but in the meantime you can use our AI-powered matching tool to connect with trusted caregivers.
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