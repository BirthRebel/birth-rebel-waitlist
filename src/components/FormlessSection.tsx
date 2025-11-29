import { Button } from "@/components/ui/button";

export const FormlessSection = () => {
  return (
    <section className="h-full flex items-center justify-center bg-gradient-soft px-6">
      <div className="w-full max-w-4xl text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Tell Us What You Need
        </h2>
        <p className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
          Share your maternal care needs and we'll connect you with the perfect support
        </p>
        
        <Button 
          variant="hero" 
          size="xl"
          onClick={() => window.open('https://formless.ai/c/L4iE1bTSHy6C', '_blank')}
          className="animate-pulse hover:animate-none"
        >
          Register Your Need
        </Button>
      </div>
    </section>
  );
};
