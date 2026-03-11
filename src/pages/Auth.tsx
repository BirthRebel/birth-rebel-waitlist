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
import {
  validatePassword,
  isPasswordRecoveryUrl,
  formatAuthError,
} from "@/lib/authUtils";

const TYPEFORM_URL =
  "https://form.typeform.com/to/eAJV4XXH?typeform-source=birthrebel.com";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const prefillType = searchParams.get("type") as "parent" | "caregiver" | null;

  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [userType, setUserType] = useState<"parent" | "caregiver">(
    prefillType || "parent",
  );
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isFromEmailLink = !!prefillEmail;

  const [isRecoveryLink, setIsRecoveryLink] = useState(() =>
    isPasswordRecoveryUrl(),
  );

  useEffect(() => {
    if (isRecoveryLink) {
      console.log(
        "Recovery link detected, waiting for PASSWORD_RECOVERY event",
      );
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);

      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event detected");
        setIsSettingNewPassword(true);
        setIsLogin(false);
        setIsReset(false);
        setIsRecoveryLink(true);
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
        toast({
          title: "Set your new password",
          description: "Enter your new password below.",
        });
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const hash = window.location.hash;
        if (hash.includes("type=recovery")) {
          console.log(
            "SIGNED_IN with recovery hash, switching to password reset mode",
          );
          setIsSettingNewPassword(true);
          setIsLogin(false);
          setIsReset(false);
          setIsRecoveryLink(true);
          setEmail(session.user.email || "");
          toast({
            title: "Set your new password",
            description: "Enter your new password below.",
          });
          return;
        }

        if (!isSettingNewPassword && !isRecoveryLink) {
          redirectBasedOnUserType(session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isSettingNewPassword, isRecoveryLink]);

  const redirectBasedOnUserType = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("caregivers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      navigate(data ? "/caregiver/matches" : "/parent/dashboard");
    } catch (error) {
      console.error("Redirect error:", error);
      navigate("/parent/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSettingNewPassword) {
        const { valid, message } = validatePassword(password);
        if (!valid) {
          throw new Error(message);
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          if (
            error.message?.toLowerCase().includes("must contain") ||
            error.status === 422
          ) {
            throw new Error(
              "Password does not meet requirements. Please include at least 8 characters, uppercase, lowercase, and a special character.",
            );
          }
          throw error;
        }

        toast({
          title: "Password updated!",
          description:
            "Your password has been successfully changed. You are now logged in.",
        });
        setIsSettingNewPassword(false);
        setLoading(false);

        const {
          data: { session },
        } = await supabase.auth.getSession();
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
        const { data: signInData, error } =
          await supabase.auth.signInWithPassword({
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

        const { data: caregiver, error: caregiverError } = await supabase
          .from("caregivers")
          .select("id")
          .eq("user_id", signInData.user.id)
          .maybeSingle();

        if (caregiverError) {
          console.log(
            "Caregiver check skipped (RLS or error):",
            caregiverError.message,
          );
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

        const { error: linkError } = await supabase
          .from("caregivers")
          .update({ user_id: signInData.user.id })
          .eq("email", email)
          .is("user_id", null);

        if (!linkError) {
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
          description: formatAuthError(error),
          variant: "destructive",
        });
        return;
      }

      if (userType === "caregiver" && signUpData.user) {
        await supabase
          .from("caregivers")
          .update({ user_id: signUpData.user.id })
          .eq("email", email)
          .is("user_id", null);
      }

      if (userType === "parent" && signUpData.user) {
        const { data: existingRequest } = await supabase
          .from("parent_requests")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (!existingRequest && firstName) {
          await supabase.from("parent_requests").insert({
            email,
            first_name: firstName,
            status: "new",
          });
        }
      }

      toast({
        title: "Check your email",
        description:
          "Click the confirmation link, then come back here to log in.",
      });
      setLoading(false);
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
                Create an account with <strong>{prefillEmail}</strong> to view
                your messages
              </p>
            )}

            {isFromEmailLink && isLogin && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                Log in with <strong>{prefillEmail}</strong> to view your
                messages, or sign up if this is your first time
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
                  <Label htmlFor="password">
                    {isSettingNewPassword ? "New Password" : "Password"}
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
              <p
                className="text-center mt-4 text-sm"
                style={{ color: "#36454F" }}
              >
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
                    {isLogin
                      ? "Don't have an account?"
                      : "Already have an account?"}{" "}
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
