import logo from "@/assets/birth-rebel-logo.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <img 
          src={logo} 
          alt="Birth Rebel" 
          className="h-16 md:h-20 lg:h-24"
        />
      </div>
    </header>
  );
};
