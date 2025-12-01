import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import leahFamily from "@/assets/leah-family-new.jpg";

const About = () => {
  const faqs = [
    {
      question: "How much does this service cost?",
      answer: "Our matching service is totally free. We know finding a maternal caregiver can be a daunting task so we wanted to make sure you weren't out of pocket until you have found your ideal caregiver. You will be charged by your caregiver when you start to connect with them and pricing will be set by them. When you start the matching process you will be asked about your budget."
    },
    {
      question: "Does Birth Rebel offer online or face to face support?",
      answer: "All support via Birth Rebel is virtual only."
    },
    {
      question: "Is Birth Rebel available throughout pregnancy and after birth?",
      answer: "Yes, our platform supports connecting with caregivers for antenatal, active labour, and postnatal support, including doulas, feeding consultants, hypnobirthing teachers, and newborn sleep experts."
    },
    {
      question: "How do you ensure the quality and safety of your caregivers?",
      answer: "Before being matched, caregivers are verified, ensuring accreditations, qualifications, and insurances are in place."
    },
    {
      question: "Do I need to follow through with any of the pairings shown to me?",
      answer: "There is never any pressure to follow through with the matching. Your data will not be shown to the caregiver so it's your choice if you go ahead with sessions."
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-48 pb-16">
        {/* Hero Section */}
        <div className="py-16" style={{ backgroundColor: '#36454F' }}>
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center" style={{ color: '#DED9CD' }}>
              About Birth Rebel
            </h1>
          </div>
        </div>

        {/* Own Your Journey Section */}
        <div className="py-16" style={{ backgroundColor: '#DED9CD' }}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#E2725B' }}>
              Own your journey into motherhood
            </h2>
            <div className="space-y-4 text-lg leading-relaxed" style={{ color: '#36454F' }}>
              <p>
                Birth Rebel was founded in 2025 to remove the traditional barriers to maternal care and make personalised maternal care more accessible and more affordable. As a fully virtual platform, we match and connect expectant and new mothers during antenatal, live birth, and post natal phases of their motherhood journey. 1-2-1 care is completely tailored to your specific needs and experiences so that you can take control of your birthing decisions and be educated about your rights. Our caregivers provide informative guidance, emotional support, and practical guidance. Using the matching platform you will be able to find qualified doulas, private midwives, hypnobirthing instructors, lactation consultants, sleep consultants and more. As the unmet need for maternal health services continues to grow, Birth Rebel is committed to expanding access to continuous and personalised maternal care globally.
              </p>
            </div>
          </div>
        </div>

        {/* My Story Section */}
        <div className="py-16" style={{ backgroundColor: '#DED9CD' }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={leahFamily} 
                  alt="Leah and family" 
                  className="w-full h-auto"
                />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#E2725B' }}>
                  My Story
                </h2>
                <div className="space-y-4 text-lg leading-relaxed" style={{ color: '#36454F' }}>
                  <p>
                    I'm Leah, founder of Birth Rebel. When I was pregnant with my second child, I trained as a doula and hypnobirthing consultant, passionate about supporting other women through their birthing journey. However, I soon discovered a fundamental flaw in the traditional doula system – the requirement to be on-call for up to a month (two weeks either side of due dates) made it impossible for me to practice while caring for two small children at home.
                  </p>
                  <p>
                    This experience revealed something profoundly wrong with the system: women who desperately want to help other women during this vulnerable yet powerful journey are often unable to do so because of inflexible traditional structures. That's when the first seed of Birth Rebel was planted.
                  </p>
                  <p>
                    As I delved deeper into the challenges facing maternal care – from the pressures on NHS services and the rapidly growing rates of medical interventions to the increasing levels of post-birth trauma and rising interest in doula support – I realized there had to be a better way. Birth Rebel represents that better way: a platform that breaks down barriers and creates flexible, accessible paths for both caregivers and mothers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="py-16" style={{ backgroundColor: '#DED9CD' }}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-12" style={{ color: '#E2725B' }}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-xl md:text-2xl font-semibold" style={{ color: '#36454F' }}>
                    {faq.question}
                  </h3>
                  <p className="text-lg leading-relaxed" style={{ color: '#36454F' }}>
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
