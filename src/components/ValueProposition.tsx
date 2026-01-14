import { Globe, Users, Calendar, Shield, MessageCircle } from "lucide-react";

export const ValueProposition = () => {
  const features = [
    {
      icon: Globe,
      title: "No geographical barriers",
      description: "Accessible anywhere, anytime — breaking down location constraints with fully virtual care"
    },
    {
      icon: Users,
      title: "Expert matching",
      description: "Intelligent pairing with certified doulas and specialists tailored to your unique needs"
    },
    {
      icon: Calendar,
      title: "Flexible scheduling",
      description: "Book appointments and sessions that fit your schedule and lifestyle"
    },
    {
      icon: Shield,
      title: "Trusted professionals",
      description: "All caregivers are certified, vetted, and committed to your wellbeing"
    },
    {
      icon: MessageCircle,
      title: "On-platform messaging",
      description: "Stay connected with your care team through secure, convenient messaging"
    }
  ];

  return (
    <section className="py-20 bg-value-bg">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="text-center group hover:transform hover:scale-105 transition-smooth"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-smooth">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};