import { Check } from "lucide-react";

export const ValueProposition = () => {
  const benefits = [
    "Affordable, continuous care at one-third the cost of in-person support",
    "Fully virtual: video calls, scheduling, and secure messaging all under one roof",
    "Accessible anywhere, anytime — no geographical barriers"
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid gap-8 md:gap-12">
          {benefits.map((benefit, index) => (
            <div 
              key={index} 
              className="flex items-start gap-4 group hover:transform hover:scale-105 transition-smooth"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center mt-1">
                <Check className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-lg md:text-xl text-foreground leading-relaxed group-hover:text-primary transition-smooth">
                {benefit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};