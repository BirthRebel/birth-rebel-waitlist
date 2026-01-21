import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import heroVideo from "@/assets/hero-video.mp4";

const caregiverTypes = [
  "doula",
  "hypnobirthing tutor",
  "sleep expert",
  "lactation specialist"
];

export const HeroSection = () => {
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollOffset((prev) => {
        const next = prev + 1;
        return next >= caregiverTypes.length ? 0 : next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-full flex items-center justify-center overflow-hidden">
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-32 md:pt-36">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-white">
          <span>Connect with your</span>
          
          <span className="block mt-4">
            <span className="inline-block text-center">
              {caregiverTypes.map((type, index) => (
                <span 
                  key={type}
                  className={`flex items-center justify-center gap-2 text-lg md:text-2xl lg:text-3xl font-sans font-normal leading-relaxed transition-all duration-300 ${
                    index === scrollOffset 
                      ? 'text-white scale-105' 
                      : 'text-[#E2725B]'
                  }`}
                >
                  {type}
                  {index === 0 && <ChevronDown className="w-4 h-4 md:w-6 md:h-6 text-[#E2725B]" />}
                </span>
              ))}
            </span>
          </span>
          
          <span className="block mt-4 md:mt-6 text-white">
            from the comfort
          </span>
          <span className="block text-white">
            of your home
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed text-white/90">
          Birth Rebel helps you find trusted, personalised maternal support — all online, all in one place. We connect expectant and new parents with experienced doulas, lactation consultants, sleep experts and hypnobirthing teachers, so you can get the right help at the right time.
        </p>
        
        <div className="mb-8 max-w-2xl mx-auto">
          <p className="text-lg md:text-xl text-white/90">
            Tell us what you're looking for in a quick 5-minute questionnaire, and our team will personally review your answers and match you with the most suitable caregiver from our current pilot roster.
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