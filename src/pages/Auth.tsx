import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const TYPEFORM_URL = "https://form.typeform.com/to/eAJV4XXH?typeform-source=birthrebel.com";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const prefillType = searchParams.get("type") as "parent" | "caregiver" | null;
  
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [userType, setUserType] = useState<"parent" | "caregiver">(prefillType || "parent");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show helpful message if coming from email link
  const isFromEmailLink = !!prefillEmail;

  // Check if this is a password recovery link (has token in URL hash)
  const isRecoveryLink = window.location.hash.includes('type=recovery') || 
                         window.location.hash.includes('access_token');

  useEffect(() => {
    // If this looks like a recovery link, don't do anything until the auth event fires
    if (isRecoveryLink) {
      console.log("Recovery link detected, waiting for PASSWORD_RECOVERY event");
    }

    // Listen for auth state changes including PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event detected");
        setIsSettingNewPassword(true);
        setIsLogin(false);
        setIsReset(false);
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
        toast({
          title: "Set your new password",
          description: "Enter your new password below.",
        });
        return; // Don't do anything else
      }
      
      // Only redirect on SIGNED_IN if not in password setting mode and not a recovery link
      if (event === "SIGNED_IN" && session?.user && !isSettingNewPassword && !isRecoveryLink) {
        redirectBasedOnUserType(session.user.id);
      }
    });

    // Only check existing session if NOT a recovery link
    if (!isRecoveryLink) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !isSettingNewPassword) {
          redirectBasedOnUserType(session.user.id);
        }
      });
    }

    return () => subscription.unsubscribe();
  }, [isSettingNewPassword, isRecoveryLink]);

  const redirectBasedOnUserType = async (userId: string) => {
    try {
      // Check if caregiver with timeout
      const caregiverPromise = supabase
        .from("caregivers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      try {
        const { data: caregiver } = await Promise.race([caregiverPromise, timeoutPromise]) as any;
        if (caregiver) {
          navigate("/caregiver/matches");
          return;
        }
      } catch (e) {
        console.log("Caregiver check timed out or failed, continuing as parent");
      }

      // Default to parent dashboard
      navigate("/parent/dashboard");
    } catch (error) {
      console.error("Redirect error:", error);
      navigate("/parent/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Handle setting new password after recovery
      if (isSettingNewPassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        toast({
          title: "Password updated!",
          description: "Your password has been successfully changed. You are now logged in.",
        });
        setIsSettingNewPassword(false);
        setLoading(false);
        
        // Get current session and redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          redirectBasedOnUserType(session.user.id);
        }
        return;
      }

      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://birth-rebel-waitlist.lovable.app/auth",
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
        const { data: caregiver, error: caregiverError } = await supabase
          .from("caregivers")
          .select("id")
          .eq("user_id", signInData.user.id)
          .maybeSingle();

        // If there's an error (likely RLS), just skip caregiver check
        if (caregiverError) {
          console.log("Caregiver check skipped (RLS or error):", caregiverError.message);
        }

        if (caregiver) {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          setLoading(false);
          navigate("/caregiver/matches");
          return;
        }

        // Try to link by email for caregivers (ignore errors)
        const { error: linkError } = await supabase
          .from("caregivers")
          .update({ user_id: signInData.user.id })
          .eq("email", email)
          .is("user_id", null);

        if (!linkError) {
          // Re-check if linking worked
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
          emailRedirectTo: "https://birth-rebel-waitlist.lovable.app/auth",
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
              {isSettingNewPassword
                ? "Set New Password"
                : isReset
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

            {!isLogin && !isReset && !isSettingNewPassword && (
              <Tabs
                value={userType}
                onValueChange={(v) => {
                  if (v === "caregiver") {
                    window.open(TYPEFORM_URL, "_blank");
                  } else {
                    setUserType(v as "parent" | "caregiver");
                  }
                }}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="parent">I'm a Parent</TabsTrigger>
                  <TabsTrigger value="caregiver">I'm a Caregiver</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isReset && !isSettingNewPassword && (
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

              {!isSettingNewPassword && (
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
              )}

              {isSettingNewPassword && (
                <p className="text-center text-sm text-muted-foreground mb-2">
                  Setting new password for <strong>{email}</strong>
                </p>
              )}

              {(!isReset || isSettingNewPassword) && (
                <div>
                  <Label htmlFor="password">{isSettingNewPassword ? "New Password" : "Password"}</Label>
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
                  : isSettingNewPassword
                  ? "Save New Password"
                  : isReset
                  ? "Send Reset Link"
                  : isLogin
                  ? "Log In"
                  : "Sign Up"}
              </Button>
            </form>

            {isLogin && !isReset && !isSettingNewPassword && (
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

            {!isSettingNewPassword && (
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
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
