import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { validatePassword, formatAuthError } from "@/lib/authUtils";

const TYPEFORM_URL =
  "https://form.typeform.com/to/eAJV4XXH?typeform-source=birthrebel.com";

const CaregiverAuth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<
    "login" | "signup" | "reset" | "update_password"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Listen for PASSWORD_RECOVERY event when user clicks reset link
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      if (event === "PASSWORD_RECOVERY") {
        setMode("update_password");
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
        toast({
          title: "Set your new password",
          description: "Please enter your new password below.",
        });
      } else if (event === "SIGNED_IN" && mode !== "update_password") {
        navigate("/caregiver/matches", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [mode, navigate, toast]);

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

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    const { valid, message } = validatePassword(password);
    if (!valid) {
      toast({
        title: "Password too weak",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been set. Redirecting...",
      });

      navigate("/caregiver/matches", { replace: true });
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Error",
        description: formatAuthError(error),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "update_password") {
      await handleUpdatePassword();
      return;
    }

    setLoading(true);

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://birth-rebel-waitlist.lovable.app/caregiver/auth",
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
        if (password !== confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: "Please make sure your passwords match.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { valid, message } = validatePassword(password);
        if (!valid) {
          toast({
            title: "Password too weak",
            description: message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                "https://birth-rebel-waitlist.lovable.app/caregiver/auth",
            },
          });

        if (signUpError) {
          console.error("Signup error:", signUpError);
          if (
            signUpError.message.includes("already registered") ||
            signUpError.message.includes("User already registered")
          ) {
            toast({
              title: "Account exists",
              description:
                "This email is already registered. Please log in instead.",
              variant: "destructive",
            });
            setMode("login");
            setLoading(false);
            return;
          }
          toast({
            title: "Signup failed",
            description: formatAuthError(signUpError),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (signUpData.user) {
          await supabase
            .from("caregivers")
            .update({ user_id: signUpData.user.id })
            .eq("email", email)
            .is("user_id", null);

          toast({
            title: "Account created!",
            description: "Your account has been set up. You can now log in.",
          });

          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email,
              password,
            },
          );

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
          description: formatAuthError(error),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome!",
        description: "Logging you in...",
      });

      setLoading(false);
      navigate("/caregiver/matches", { replace: true });
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: formatAuthError(error),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "signup":
        return "Create Your Account";
      case "reset":
        return "Reset Password";
      case "update_password":
        return "Set New Password";
      default:
        return "Caregiver Login";
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    switch (mode) {
      case "signup":
        return "Create Account";
      case "reset":
        return "Send Reset Link";
      case "update_password":
        return "Set Password";
      default:
        return "Log In";
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#FFFAF5" }}
    >
      <Header />
      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1
              className="text-2xl font-bold text-center mb-2"
              style={{ color: "#E2725B" }}
            >
              {getTitle()}
            </h1>

            {mode === "signup" && (
              <p className="text-center text-sm text-muted-foreground mb-6">
                Set up your password to access your caregiver dashboard
              </p>
            )}

            {mode === "update_password" && (
              <p className="text-center text-sm text-muted-foreground mb-6">
                Choose a secure password for your account
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode !== "update_password" && (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    disabled={
                      mode === "signup" && searchParams.get("email") !== null
                    }
                  />
                </div>
              )}

              {mode === "update_password" && email && (
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground py-2">{email}</p>
                </div>
              )}

              {(mode === "login" ||
                mode === "signup" ||
                mode === "update_password") && (
                <div>
                  <Label htmlFor="password">
                    {mode === "update_password" ? "New Password" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={8}
                  />
                </div>
              )}

              {(mode === "signup" || mode === "update_password") && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={8}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                style={{ backgroundColor: "#E2725B" }}
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
                  style={{ color: "#E2725B" }}
                >
                  Forgot password?
                </button>
              </p>
            )}

            <div
              className="text-center mt-4 text-sm"
              style={{ color: "#36454F" }}
            >
              {mode === "reset" && (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="underline font-medium"
                  style={{ color: "#E2725B" }}
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
                      style={{ color: "#E2725B" }}
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
                      style={{ color: "#E2725B" }}
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
                    style={{ color: "#E2725B" }}
                  >
                    Log in
                  </button>
                </p>
              )}

              {mode === "update_password" && (
                <p className="text-muted-foreground">
                  Setting password for your caregiver account
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
