import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import heroVideo from "@/assets/hero-video.mp4";

const caregiverTypes = [
  "doula",
  "hypnobirthing tutor",
  "sleep expert",
  "lactation specialist"
];

export const HeroSection = () => {
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
          
          <div className="mt-4 mb-4 flex justify-center">
            <div className="overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-[#E2725B] text-sm md:text-base font-sans font-medium">
                <span>Select your caregiver</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              <ul className="text-center font-sans font-normal mt-1">
                {caregiverTypes.map((type) => (
                  <li 
                    key={type}
                    className="px-3 py-0.5 text-sm md:text-base text-[#E2725B] hover:text-white cursor-pointer transition-colors"
                  >
                    {type}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <span className="block mt-4 md:mt-6 text-white">
            from the comfort of your home
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