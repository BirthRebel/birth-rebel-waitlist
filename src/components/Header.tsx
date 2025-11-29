import logo from "@/assets/birth-rebel-logo.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <img 
          src={logo} 
          alt="Birth Rebel" 
          className="h-8 md:h-10"
        />
      </div>
    </header>
  );
};
