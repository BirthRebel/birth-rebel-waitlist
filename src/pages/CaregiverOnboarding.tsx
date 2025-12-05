import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SupportType = Database["public"]["Enums"]["support_type"];

const CaregiverOnboarding = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [supportType, setSupportType] = useState<SupportType>("doula");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/caregiver/auth");
        return;
      }

      // Pre-fill email from auth
      setEmail(session.user.email || "");

      // Check if already a caregiver
      const { data: caregiver } = await supabase
        .from("caregivers")
        .select("id")
        .maybeSingle();

      if (caregiver) {
        navigate("/caregiver/matches");
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("caregivers").insert({
        user_id: user.id,
        name,
        email,
        type_of_support: supportType,
      });

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your caregiver profile has been created.",
      });

      navigate("/caregiver/matches");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAF5' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAF5' }}>
      <Header />
      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-2" style={{ color: '#E2725B' }}>
              Complete Your Profile
            </h1>
            <p className="text-center mb-6" style={{ color: '#36454F' }}>
              Tell us a bit about yourself to get started.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <Label>Type of Support</Label>
                <RadioGroup
                  value={supportType}
                  onValueChange={(value) => setSupportType(value as SupportType)}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="doula" id="doula" />
                    <Label htmlFor="doula" className="font-normal">Doula</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lactation" id="lactation" />
                    <Label htmlFor="lactation" className="font-normal">Lactation Consultant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sleep" id="sleep" />
                    <Label htmlFor="sleep" className="font-normal">Sleep Consultant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hypnobirthing" id="hypnobirthing" />
                    <Label htmlFor="hypnobirthing" className="font-normal">Hypnobirthing Instructor</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                style={{ backgroundColor: '#E2725B' }}
              >
                {loading ? "Creating profile..." : "Complete Setup"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverOnboarding;
