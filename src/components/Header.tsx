import { Link } from "react-router-dom";
import logo from "@/assets/birth-rebel-logo.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link to="/">
            <img 
              src={logo} 
              alt="Birth Rebel" 
              className="h-32 md:h-40 lg:h-48"
            />
          </Link>
          
          <nav className="flex gap-8">
            <Link 
              to="/" 
              className="text-lg font-semibold hover:text-primary transition-colors"
              style={{ color: '#36454F' }}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-lg font-semibold hover:text-primary transition-colors"
              style={{ color: '#36454F' }}
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
