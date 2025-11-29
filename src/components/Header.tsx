import logo from "@/assets/birth-rebel-logo.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <img 
          src={logo} 
          alt="Birth Rebel" 
          className="h-24 md:h-32 lg:h-40"
        />
      </div>
    </header>
  );
};
