import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const CaregiverAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/caregiver/auth`,
        });
        if (error) throw error;
        
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
        setIsReset(false);
        setLoading(false);
        return;
      }
      
      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          setLoading(false);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        
        // Check if user has a linked caregiver profile
        const { data: caregiver } = await supabase
          .from("caregivers")
          .select("id")
          .eq("user_id", signInData.user.id)
          .maybeSingle();
        
        // If no linked profile, try to link by email
        if (!caregiver) {
          await supabase
            .from("caregivers")
            .update({ user_id: signInData.user.id })
            .eq("email", email)
            .is("user_id", null);
          
          // Re-check for caregiver after linking
          const { data: linkedCaregiver } = await supabase
            .from("caregivers")
            .select("id")
            .eq("user_id", signInData.user.id)
            .maybeSingle();
          
          toast({
            title: "Welcome!",
            description: linkedCaregiver ? "Your account has been linked." : "You have successfully logged in.",
          });
          
          setLoading(false);
          navigate(linkedCaregiver ? "/caregiver/matches" : "/caregiver/onboarding");
          return;
        }
        
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        
        setLoading(false);
        navigate(caregiver ? "/caregiver/matches" : "/caregiver/onboarding");
        return;
      }
      
      // Sign up
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/caregiver/auth`,
        },
      });
      
      if (error) {
        setLoading(false);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Check your email",
        description: "Click the confirmation link, then come back here to log in.",
      });
      setLoading(false);
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAF5' }}>
      <Header />
      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#E2725B' }}>
              {isReset ? "Reset Password" : isLogin ? "Caregiver Login" : "Caregiver Sign Up"}
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
              
              {!isReset && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
                style={{ backgroundColor: '#E2725B' }}
              >
                {loading ? "Loading..." : isReset ? "Send Reset Link" : isLogin ? "Log In" : "Sign Up"}
              </Button>
            </form>
            
            {isLogin && !isReset && (
              <p className="text-center mt-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsReset(true)}
                  className="underline font-medium"
                  style={{ color: '#E2725B' }}
                >
                  Forgot password?
                </button>
              </p>
            )}
            
            <p className="text-center mt-4 text-sm" style={{ color: '#36454F' }}>
              {isReset ? (
                <button
                  type="button"
                  onClick={() => setIsReset(false)}
                  className="underline font-medium"
                  style={{ color: '#E2725B' }}
                >
                  Back to login
                </button>
              ) : (
                <>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="underline font-medium"
                    style={{ color: '#E2725B' }}
                  >
                    {isLogin ? "Sign up" : "Log in"}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverAuth;