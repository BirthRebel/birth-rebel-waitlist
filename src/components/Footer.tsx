import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Birth Rebel</h3>
            <p className="text-background/80">Rebuilding trust in maternal care</p>
          </div>

          <a 
            href="https://www.instagram.com/wearebirthrebel/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-background/80 hover:text-background transition-colors"
            aria-label="Follow us on Instagram"
          >
            <Instagram size={24} />
          </a>

          <div className="text-center text-sm text-background/60 max-w-2xl">
            <p>
              <strong>Disclaimer:</strong> Birth Rebel is not a substitute for medical advice or emergency care. 
              Always consult with qualified healthcare professionals for medical decisions.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <Link 
              to="/privacy-policy" 
              className="text-background/60 hover:text-background transition-colors"
            >
              Privacy Policy
            </Link>
          </div>

          <div className="text-center text-xs text-background/40">
            <p>&copy; 2024 Birth Rebel. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};