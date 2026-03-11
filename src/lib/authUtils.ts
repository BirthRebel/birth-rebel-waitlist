export function validatePassword(password: string): {
  valid: boolean;
  message: string;
} {
  const missing: string[] = [];
  if (password.length < 8) missing.push("at least 8 characters");
  if (!/[a-z]/.test(password)) missing.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) missing.push("an uppercase letter");
  if (!/[^a-zA-Z0-9]/.test(password))
    missing.push("a special character (e.g. !@#$%)");

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Password must include: ${missing.join(", ")}.`,
    };
  }
  return { valid: true, message: "" };
}

export function isPasswordRecoveryUrl(): boolean {
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes("type=recovery") ||
    hash.includes("access_token") ||
    search.includes("type=recovery")
  );
}

export function formatAuthError(error: any): string {
  if (!error) return "Something went wrong. Please try again.";
  const message = error.message || "";

  if (message.includes("Invalid login credentials"))
    return "Incorrect email or password.";
  if (message.includes("Email not confirmed"))
    return "Please confirm your email before logging in.";
  if (
    message.includes("User already registered") ||
    message.includes("already registered")
  )
    return "This email is already registered. Please log in instead.";
  if (message.includes("must contain") || error.status === 422)
    return "Password does not meet requirements. Please include at least 8 characters, uppercase, lowercase, and a special character.";

  return message || "Something went wrong. Please try again.";
}
