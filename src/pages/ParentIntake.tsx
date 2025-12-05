import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type SupportType = "doula" | "lactation" | "sleep" | "hypnobirthing";

const supportOptions: { value: SupportType; label: string; description: string }[] = [
  { value: "doula", label: "Doula Support", description: "Birth and postpartum support" },
  { value: "lactation", label: "Lactation Consultant", description: "Breastfeeding and feeding support" },
  { value: "sleep", label: "Sleep Consultant", description: "Baby and toddler sleep support" },
  { value: "hypnobirthing", label: "Hypnobirthing Teacher", description: "Birth preparation and relaxation techniques" },
];

export default function ParentIntake() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    supportType: "" as SupportType | "",
    dueDate: "",
    additionalInfo: "",
  });

  const handleNext = () => {
    if (step === 1 && (!formData.firstName || !formData.email)) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }
    if (step === 2 && !formData.supportType) {
      toast({ title: "Please select a support type", variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!formData.supportType) return;
    
    setLoading(true);
    try {
      // Find an active caregiver matching the support type
      const { data: caregivers, error: caregiverError } = await supabase
        .from("caregivers")
        .select("id")
        .eq("type_of_support", formData.supportType)
        .eq("active", true)
        .limit(1);

      if (caregiverError) throw caregiverError;

      if (!caregivers || caregivers.length === 0) {
        toast({
          title: "No caregivers available",
          description: "We don't have an available caregiver for this support type yet. Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create the match
      const { error: matchError } = await supabase.from("matches").insert({
        caregiver_id: caregivers[0].id,
        parent_first_name: formData.firstName,
        parent_email: formData.email,
        support_type: formData.supportType,
        status: "matched",
      });

      if (matchError) throw matchError;

      toast({
        title: "Success!",
        description: "We've matched you with a caregiver. They'll be in touch soon!",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-40 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4" style={{ color: '#36454F' }}>
              Find Your Caregiver
            </h1>
            <p className="text-lg text-muted-foreground">
              Answer a few questions and we'll match you with the right support.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-colors ${
                  s <= step ? "bg-[#E2725B]" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-soft">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6" style={{ color: '#36454F' }}>
                  Let's start with your details
                </h2>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>
                <Button
                  onClick={handleNext}
                  className="w-full bg-[#E2725B] hover:bg-[#E2725B]/90"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6" style={{ color: '#36454F' }}>
                  What type of support are you looking for?
                </h2>
                <RadioGroup
                  value={formData.supportType}
                  onValueChange={(value) => setFormData({ ...formData, supportType: value as SupportType })}
                  className="space-y-4"
                >
                  {supportOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.supportType === option.value
                          ? "border-[#E2725B] bg-[#E2725B]/5"
                          : "border-border hover:border-[#E2725B]/50"
                      }`}
                      onClick={() => setFormData({ ...formData, supportType: option.value })}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div>
                        <Label htmlFor={option.value} className="text-lg font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-muted-foreground text-sm mt-1">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleBack} size="lg" className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-[#E2725B] hover:bg-[#E2725B]/90"
                    size="lg"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-6" style={{ color: '#36454F' }}>
                  Almost done! Any additional details?
                </h2>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date / Baby's Birth Date (optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Anything else you'd like us to know? (optional)</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                    placeholder="Tell us about your situation, concerns, or preferences..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleBack} size="lg" className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-[#E2725B] hover:bg-[#E2725B]/90"
                    size="lg"
                  >
                    {loading ? "Submitting..." : "Find My Caregiver"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
