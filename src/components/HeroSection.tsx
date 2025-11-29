import { Button } from "@/components/ui/button";
import strawberryImg from "@/assets/strawberry-illustration.png";
import peachImg from "@/assets/peach-illustration.png";
import orangeImg from "@/assets/orange-illustration.png";
import lemonImg from "@/assets/lemon-illustration.png";

export const HeroSection = () => {
  return (
    <section className="relative h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#9CAF88' }}>
      {/* Decorative fruit overlays */}
      <img 
        src={strawberryImg} 
        alt="" 
        className="absolute top-20 left-10 w-24 md:w-32 opacity-80 animate-float" 
        style={{ transform: 'rotate(-15deg)' }}
      />
      <img 
        src={peachImg} 
        alt="" 
        className="absolute top-32 right-16 w-28 md:w-36 opacity-70 animate-float-delayed" 
        style={{ transform: 'rotate(10deg)', animationDelay: '1s' }}
      />
      <img 
        src={orangeImg} 
        alt="" 
        className="absolute bottom-24 left-20 w-32 md:w-40 opacity-75 animate-float" 
        style={{ transform: 'rotate(25deg)', animationDelay: '2s' }}
      />
      <img 
        src={lemonImg} 
        alt="" 
        className="absolute bottom-32 right-24 w-20 md:w-28 opacity-80 animate-float-delayed" 
        style={{ transform: 'rotate(-20deg)', animationDelay: '0.5s' }}
      />
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