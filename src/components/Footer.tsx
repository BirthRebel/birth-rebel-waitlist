import { Instagram, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Birth Rebel</h3>
            <p className="text-background/80">Rebuilding trust in maternal care</p>
          </div>

          <div className="flex space-x-6">
            <a 
              href="https://instagram.com/birthrebel" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-background/10 hover:bg-background/20 transition-smooth"
              aria-label="Follow Birth Rebel on Instagram"
            >
              <Instagram className="w-6 h-6" />
            </a>
            <a 
              href="https://linkedin.com/company/birthrebel" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-background/10 hover:bg-background/20 transition-smooth"
              aria-label="Follow Birth Rebel on LinkedIn"
            >
              <Linkedin className="w-6 h-6" />
            </a>
          </div>

          <div className="text-center text-sm text-background/60 max-w-2xl">
            <p>
              <strong>Disclaimer:</strong> Birth Rebel is not a substitute for medical advice or emergency care. 
              Always consult with qualified healthcare professionals for medical decisions.
            </p>
          </div>

          <div className="text-center text-xs text-background/40">
            <p>&copy; 2024 Birth Rebel. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};