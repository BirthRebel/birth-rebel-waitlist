import { useEffect } from "react";

export const FormlessSection = () => {
  useEffect(() => {
    // Load the Formless embed script
    const script = document.createElement('script');
    script.src = 'https://embed.formless.ai/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <section className="h-full flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Register Your Need
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Tell us about your maternal care needs and we'll connect you with the right support
          </p>
        </div>
        
        <iframe 
          src="https://formless.ai/c/L4iE1bTSHy6C" 
          className="formless-embed w-full rounded-lg shadow-soft" 
          width="100%" 
          height="600px" 
          loading="lazy" 
          allow="microphone" 
          style={{ border: 0, display: 'block' }}
          title="Mother registration form"
        />
      </div>
    </section>
  );
};
