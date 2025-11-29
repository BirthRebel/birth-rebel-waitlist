import { DollarSign, Video, Globe, Users, Calendar, Shield, MessageCircle, Clock } from "lucide-react";

export const ValueProposition = () => {
  const features = [
    {
      icon: DollarSign,
      title: "More affordable",
      description: "Affordable, continuous care at a fraction of in-person support prices"
    },
    {
      icon: Video,
      title: "Video and messaging",
      description: "Fully virtual: video calls, scheduling, and secure messaging all in-platform"
    },
    {
      icon: Globe,
      title: "No geographical barriers",
      description: "Accessible anywhere, anytime — breaking down location constraints"
    },
    {
      icon: Users,
      title: "Expert matching",
      description: "Intelligent pairing with certified doulas and specialists for your needs"
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
      title: "Continuous support",
      description: "Stay connected with your care team throughout your maternal journey"
    },
    {
      icon: Clock,
      title: "24/7 availability",
      description: "Access support when you need it most, day or night"
    }
  ];

  return (
    <section className="py-20 bg-value-bg">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What's Coming soon.
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We're building a fully virtual end-to-end maternity care platform, making quality maternal care accessible, affordable, and available to every mother.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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