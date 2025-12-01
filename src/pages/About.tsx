import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-48 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-8" style={{ color: '#36454F' }}>
            About Birth Rebel
          </h1>
          
          <div className="space-y-6 text-lg" style={{ color: '#36454F' }}>
            <p>
              Birth Rebel is on a mission to rebuild trust in maternal care by connecting 
              expectant and new mothers with qualified, compassionate caregivers.
            </p>
            
            <p>
              We believe that every mother deserves access to quality, affordable care 
              throughout their pregnancy journey and into motherhood. Our platform makes 
              it easy to find the right support, whether you're looking for a doula, 
              lactation consultant, hypnobirthing teacher, or sleep expert.
            </p>
            
            <p>
              Founded on the principle that maternal care should be accessible to all, 
              we're building a community where mothers feel supported, informed, and 
              empowered to make the best decisions for themselves and their families.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
