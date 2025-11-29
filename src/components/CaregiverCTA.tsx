import { Button } from "@/components/ui/button";

export const CaregiverCTA = () => {
  return (
    <section className="h-full flex items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-4xl text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Join Our Caregiver Network
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          We are looking to grow our caregiver database. We are looking for doulas, lactation consultants, 
          sleep experts, hypnobirthing teachers and more. If you would like to join up we would love to hear 
          from you. Please fill out this form to get started.
        </p>
        
        <Button 
          variant="hero" 
          size="xl"
          onClick={() => window.open('https://form.typeform.com/to/eAJV4XXH', '_blank')}
          className="animate-pulse hover:animate-none"
        >
          Join as a Caregiver
        </Button>
      </div>
    </section>
  );
};
