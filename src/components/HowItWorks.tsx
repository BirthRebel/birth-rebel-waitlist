import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const HowItWorks = () => {
  const navigate = useNavigate();
  const steps = [
    {
      number: "01",
      title: "Answer a set of questions",
      description: "Get a better idea of what you are looking for. This should take about 5 minutes. All information is confidential and securely stored."
    },
    {
      number: "02",
      title: "Get paired with the right caregiver",
      description: "Whether it's antenatal, active birth, postnatal, feeding support, sleep advice or just a general chat, we'll match you to the right caregiver based on your needs."
    },
    {
      number: "03",
      title: "Review your match",
      description: "We will send you a voice-enabled bio of your caregiver so that you have a chance to review before you commit."
    },
    {
      number: "04",
      title: "Start your journey",
      description: "Book in your first call with your caregiver. If at any time your circumstances change, we can work with you to find someone more suitable."
    }
  ];

  return (
    <section className="py-20 px-6" style={{ backgroundColor: '#E2725B' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4" style={{ color: '#36454F' }}>
            How It Works
          </h2>
          <p className="text-lg" style={{ color: '#E8C6A8' }}>
            For new and expectant parents
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="group relative"
            >
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <span className="text-5xl font-display font-bold transition-smooth" style={{ color: '#36454F' }}>
                    {step.number}
                  </span>
                </div>
                <div className="pt-2">
                  <h3 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: '#E8C6A8' }}>
                    {step.title}
                  </h3>
                  <p className="leading-relaxed" style={{ color: '#E8C6A8' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button 
            variant="hero" 
            size="xl" 
            onClick={() => navigate('/find-caregiver')}
          >
            Find Your Maternity Caregiver
          </Button>
        </div>
      </div>
    </section>
  );
};
