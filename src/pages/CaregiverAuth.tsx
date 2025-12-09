import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const TYPEFORM_URL = "https://form.typeform.com/to/eAJV4XXH?typeform-source=birthrebel.com";

const CaregiverAuth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pre-fill email and set signup mode from URL params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const signupParam = searchParams.get("signup");
    
    if (emailParam) {
      setEmail(emailParam);
    }
    if (signupParam === "true") {
      setMode("signup");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/caregiver/auth`,
        });
        if (error) throw error;
        
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
        setMode("login");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        // Validate passwords match
        if (password !== confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: "Please make sure your passwords match.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Sign up the user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/caregiver/auth`,
          },
        });

        if (signUpError) {
          // If user already exists, suggest login instead
          if (signUpError.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please log in instead.",
              variant: "destructive",
            });
            setMode("login");
            setLoading(false);
            return;
          }
          throw signUpError;
        }

        if (signUpData.user) {
          // Try to link the caregiver profile
          await supabase
            .from("caregivers")
            .update({ user_id: signUpData.user.id })
            .eq("email", email)
            .is("user_id", null);

          toast({
            title: "Account created!",
            description: "Your account has been set up. You can now log in.",
          });
          
          // Auto-login after signup
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!signInError) {
            navigate("/caregiver/matches");
          } else {
            setMode("login");
          }
        }
        
        setLoading(false);
        return;
      }
      
      // Login mode
      const { error } = await supabase.auth.signInWithPassword({
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
      
      toast({
        title: "Welcome!",
        description: "Logging you in...",
      });
      
      // Navigate directly after successful login
      setLoading(false);
      navigate("/caregiver/matches", { replace: true });
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

  const getTitle = () => {
    switch (mode) {
      case "signup": return "Create Your Account";
      case "reset": return "Reset Password";
      default: return "Caregiver Login";
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    switch (mode) {
      case "signup": return "Create Account";
      case "reset": return "Send Reset Link";
      default: return "Log In";
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFAF5' }}>
      <Header />
      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-center mb-2" style={{ color: '#E2725B' }}>
              {getTitle()}
            </h1>
            
            {mode === "signup" && (
              <p className="text-center text-sm text-muted-foreground mb-6">
                Set up your password to access your caregiver dashboard
              </p>
            )}
            
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
                  disabled={mode === "signup" && searchParams.get("email") !== null}
                />
              </div>
              
              {mode !== "reset" && (
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

              {mode === "signup" && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {getButtonText()}
              </Button>
            </form>
            
            {mode === "login" && (
              <p className="text-center mt-3 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="underline font-medium"
                  style={{ color: '#E2725B' }}
                >
                  Forgot password?
                </button>
              </p>
            )}
            
            <div className="text-center mt-4 text-sm" style={{ color: '#36454F' }}>
              {mode === "reset" && (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="underline font-medium"
                  style={{ color: '#E2725B' }}
                >
                  Back to login
                </button>
              )}
              
              {mode === "login" && (
                <>
                  <p className="mb-2">
                    First time here?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="underline font-medium"
                      style={{ color: '#E2725B' }}
                    >
                      Create account
                    </button>
                  </p>
                  <p>
                    Want to join as a caregiver?{" "}
                    <a
                      href={TYPEFORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                      style={{ color: '#E2725B' }}
                    >
                      Register here
                    </a>
                  </p>
                </>
              )}

              {mode === "signup" && (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="underline font-medium"
                    style={{ color: '#E2725B' }}
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverAuth;