import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const FAQ = () => {
  const faqs = [
    {
      question: "What is Birth Rebel?",
      answer: "Birth Rebel is a fully virtual maternal-care platform connecting expectant and new parents with trusted, non-medical maternity caregivers — including doulas, lactation consultants, hypnobirthing teachers and sleep experts.\n\nWe're currently running a pilot, which means matching is done manually by our team to ensure the best possible fit."
    },
    {
      question: "How does the pilot work?",
      answer: "During the pilot phase:\n\n• You complete a short intake form (around 5 minutes)\n• We personally review your needs and preferences\n• We match you with a suitable caregiver from our current roster\n• You will then be able to connect and message your caregiver directly from the platform's dashboard.\n\nThis hands-on approach helps us learn, improve, and make sure early users get high-quality support."
    },
    {
      question: "Who are the caregivers on Birth Rebel?",
      answer: "All caregivers on Birth Rebel:\n\n• Are experienced professionals in their field\n• Are independently trained\n• Are insured as required\n• Have been reviewed by our team\n\nAvailability may be limited during the pilot, but we'll always be transparent about what's possible."
    },
    {
      question: "What does a virtual doula do?",
      answer: "A virtual doula provides emotional, and informational support before, during and after birth.\n\nA doula can:\n\n• Offer reassurance, encouragement and continuity of care\n• Help you prepare for birth and understand your options\n• Support you emotionally during pregnancy, labour and postnatally\n• Provide comfort measures during labour (breathing, positioning, calm presence)\n• Support feeding, bonding and recovery after birth"
    },
    {
      question: "What doesn't a doula do?",
      answer: "Doulas are not medical professionals.\n\nA doula does not:\n\n• Give medical advice or clinical care\n• Perform medical procedures\n• Replace midwives, doctors or other healthcare professionals\n• Make decisions on your behalf\n\nDoulas work alongside your medical team, not instead of them."
    },
    {
      question: "Is Birth Rebel part of the NHS?",
      answer: "No. Birth Rebel is an independent platform and is not affiliated with the NHS.\n\nOur caregivers complement - not replace - NHS maternity care."
    },
    {
      question: "How much does it cost?",
      answer: "Pricing varies depending on the type of support and the caregiver.\n\nDuring the pilot:\n\n• Fees are agreed upfront and agreed between you and the caregiver that you are matched with\n• Prices already include the platform fee\n• There are no hidden charges\n\nWe'll always be clear about costs before you commit."
    },
    {
      question: "What if I don't feel it's the right fit?",
      answer: "Finding the right support matters. If you aren't sure about who we have matched with, you can decline the match. If you can provide a little detail why the match doesn't work for you, that will help us to find someone more suitable."
    },
    {
      question: "Who is Birth Rebel for?",
      answer: "Birth Rebel is designed for parents who want:\n\n• More personalised, continuous support\n• Non-medical guidance alongside clinical care\n• Flexible, virtual access to trusted caregivers\n\nIf you're unsure, we're always happy to talk things through."
    },
    {
      question: "Why are you running a pilot?",
      answer: "Because good care needs to be built with families, not just for them.\n\nThe pilot allows us to:\n\n• Test what genuinely helps parents\n• Learn from real experiences\n• Build a platform that prioritises quality over speed\n\nYou're helping shape what Birth Rebel becomes."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-foreground mb-12 text-center">
            Frequently Asked Questions
          </h1>
          
          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border pb-8 last:border-b-0">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {faq.question}
                </h2>
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
