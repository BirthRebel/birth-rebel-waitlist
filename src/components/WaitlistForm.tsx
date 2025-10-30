import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const WaitlistForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    userType: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.userType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('waitlist_signups')
        .insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            user_type: formData.userType as 'caregiver' | 'mother' | 'interested',
            user_agent: navigator.userAgent,
            referrer: document.referrer || null
          }
        ]);

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: "Signup Failed",
          description: "There was an error joining the mailing list. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      setIsSubmitted(true);
      toast({
        title: "Successfully joined!",
        description: "Welcome to Birth Rebel. We'll be in touch soon!",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Signup Failed",
        description: "There was an error joining the mailing list. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getThankYouMessage = () => {
    if (formData.userType === "caregiver") {
      return "Thank you for joining Birth Rebel! We'll be in touch soon with opportunities to connect with mothers seeking your support.";
    }
    return "Thank you for joining Birth Rebel! You'll be among the first to access affordable, continuous support during pregnancy, birth, and beyond.";
  };

  if (isSubmitted) {
    return (
      <section className="py-20 bg-muted/50">
        <div className="max-w-2xl mx-auto px-6">
          <Card className="shadow-glow border-primary/20">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl text-primary">Welcome to Birth Rebel!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {getThankYouMessage()}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted/50">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-lg text-foreground bg-gradient-accent bg-clip-text text-transparent font-semibold">
            Join the mailing list to register your interest and be the first to know when we launch.
          </p>
        </div>

        <Card className="shadow-glow border-primary/20">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-primary">Join the Mailing List</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm text-muted-foreground">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="border-muted focus:border-primary transition-smooth"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm text-muted-foreground">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="border-muted focus:border-primary transition-smooth"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="border-muted focus:border-primary transition-smooth"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm text-muted-foreground">I am a... *</Label>
                <RadioGroup
                  value={formData.userType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, userType: value }))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-muted hover:border-primary/50 transition-smooth">
                    <RadioGroupItem value="caregiver" id="caregiver" />
                    <Label htmlFor="caregiver" className="flex-1 cursor-pointer">
                      Caregiver (doula, lactation consultant, sleep consultant, midwife, etc.)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-muted hover:border-primary/50 transition-smooth">
                    <RadioGroupItem value="mother" id="mother" />
                    <Label htmlFor="mother" className="flex-1 cursor-pointer">
                      New / Expectant Mother
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-muted hover:border-primary/50 transition-smooth">
                    <RadioGroupItem value="interested" id="interested" />
                    <Label htmlFor="interested" className="flex-1 cursor-pointer">
                      Neither, I'm just interested
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button 
                type="submit" 
                variant="form" 
                size="lg" 
                className="mt-8"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join the Mailing List"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};