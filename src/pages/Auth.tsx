import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const prefillType = searchParams.get("type") as "parent" | "caregiver" | null;
  
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [userType, setUserType] = useState<"parent" | "caregiver">(prefillType || "parent");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show helpful message if coming from email link
  const isFromEmailLink = !!prefillEmail;

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        redirectBasedOnUserType(session.user.id);
      }
    });
  }, []);

  const redirectBasedOnUserType = async (userId: string) => {
    // Check if caregiver
    const { data: caregiver } = await supabase
      .from("caregivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (caregiver) {
      navigate("/caregiver/matches");
      return;
    }

    // Check if parent (has a parent_request linked)
    const { data: userEmail } = await supabase.auth.getUser();
    if (userEmail?.user?.email) {
      const { data: parentRequest } = await supabase
        .from("parent_requests")
        .select("id")
        .eq("email", userEmail.user.email)
        .maybeSingle();

      if (parentRequest) {
        navigate("/parent/dashboard");
        return;
      }
    }

    // Default to parent dashboard for new users
    navigate("/parent/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
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

        // Check user type and redirect accordingly
        const { data: caregiver } = await supabase
          .from("caregivers")
          .select("id")
          .eq("user_id", signInData.user.id)
          .maybeSingle();

        if (!caregiver) {
          // Try to link by email for caregivers
          await supabase
            .from("caregivers")
            .update({ user_id: signInData.user.id })
            .eq("email", email)
            .is("user_id", null);

          // Re-check
          const { data: linkedCaregiver } = await supabase
            .from("caregivers")
            .select("id")
            .eq("user_id", signInData.user.id)
            .maybeSingle();

          if (linkedCaregiver) {
            toast({
              title: "Welcome back!",
              description: "Your caregiver account has been linked.",
            });
            setLoading(false);
            navigate("/caregiver/matches");
            return;
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          setLoading(false);
          navigate("/caregiver/matches");
          return;
        }

        // Not a caregiver, treat as parent
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        setLoading(false);
        navigate("/parent/dashboard");
        return;
      }

      // Sign up
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            first_name: firstName,
            user_type: userType,
          },
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

      // If signing up as caregiver, try to link existing caregiver record
      if (userType === "caregiver" && signUpData.user) {
        await supabase
          .from("caregivers")
          .update({ user_id: signUpData.user.id })
          .eq("email", email)
          .is("user_id", null);
      }

      // If signing up as parent, create or update parent request
      if (userType === "parent" && signUpData.user) {
        // Check if parent request exists
        const { data: existingRequest } = await supabase
          .from("parent_requests")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (!existingRequest && firstName) {
          // Create a basic parent request entry
          await supabase.from("parent_requests").insert({
            email,
            first_name: firstName,
            status: "new",
          });
        }
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFAF5" }}>
      <Header />
      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1
              className="text-2xl font-bold text-center mb-2"
              style={{ color: "#E2725B" }}
            >
              {isReset
                ? "Reset Password"
                : isLogin
                ? "Welcome Back"
                : "Create Account"}
            </h1>

            {isFromEmailLink && !isLogin && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                Create an account with <strong>{prefillEmail}</strong> to view your messages
              </p>
            )}

            {isFromEmailLink && isLogin && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                Log in with <strong>{prefillEmail}</strong> to view your messages, or sign up if this is your first time
              </p>
            )}

            {!isLogin && !isReset && (
              <Tabs
                value={userType}
                onValueChange={(v) => setUserType(v as "parent" | "caregiver")}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="parent">I'm a Parent</TabsTrigger>
                  <TabsTrigger value="caregiver">I'm a Caregiver</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isReset && (
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                    placeholder="Your first name"
                  />
                </div>
              )}

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
                style={{ backgroundColor: "#E2725B" }}
              >
                {loading
                  ? "Loading..."
                  : isReset
                  ? "Send Reset Link"
                  : isLogin
                  ? "Log In"
                  : "Sign Up"}
              </Button>
            </form>

            {isLogin && !isReset && (
              <p className="text-center mt-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsReset(true)}
                  className="underline font-medium"
                  style={{ color: "#E2725B" }}
                >
                  Forgot password?
                </button>
              </p>
            )}

            <p className="text-center mt-4 text-sm" style={{ color: "#36454F" }}>
              {isReset ? (
                <button
                  type="button"
                  onClick={() => setIsReset(false)}
                  className="underline font-medium"
                  style={{ color: "#E2725B" }}
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
                    style={{ color: "#E2725B" }}
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

export default Auth;
