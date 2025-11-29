import strawberryImg from "@/assets/strawberry-illustration.png";
import orangeImg from "@/assets/orange-illustration.png";

export const QuoteSection = () => {
  return (
    <section className="relative py-16 flex items-center justify-center px-6 overflow-hidden" style={{ backgroundColor: '#B7410E' }}>
      {/* Decorative fruit overlays */}
      <img 
        src={strawberryImg} 
        alt="" 
        className="absolute top-8 left-8 w-16 md:w-20 opacity-60" 
        style={{ transform: 'rotate(15deg)' }}
      />
      <img 
        src={orangeImg} 
        alt="" 
        className="absolute bottom-8 right-8 w-20 md:w-24 opacity-60" 
        style={{ transform: 'rotate(-15deg)' }}
      />
      <div className="max-w-4xl mx-auto text-center">
        <blockquote className="text-xl md:text-2xl font-display font-light leading-relaxed" style={{ color: '#D3B8A1' }}>
          "Finding quality and affordable care during pregnancy and in the transformative journey into motherhood shouldn't be difficult"
        </blockquote>
      </div>
    </section>
  );
};
