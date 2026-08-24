import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, ArrowLeft, Loader2, User, Lock, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/favorites",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  type AuthMode = "username" | "email" | "email-otp";
  const [mode, setMode] = useState<AuthMode>("username");
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username + password fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Email OTP fields
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // ── Username + Password ──
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const syntheticEmail = `${username.trim().toLowerCase()}@supercars.showcase`;
      await signIn("username-password", {
        flow,
        email: syntheticEmail,
        username: username.trim().toLowerCase(),
        password,
      });
      navigate(redirect);
    } catch (err) {
      console.error("Username auth error:", err);
      setError(
        err instanceof Error ? err.message : "Sign in failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  // ── Email OTP ──
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "");
      setOtpEmail(email);
      await signIn("email-otp", formData);
      setOtpSent(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Email sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  // ── Guest ──
  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (err) {
      console.error("Guest login error:", err);
      setError(
        `Failed to sign in as guest: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-apex-ink text-white">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden border-r border-apex-line lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 80% 15%, #2a0a04 0%, transparent 55%), radial-gradient(100% 90% at 20% 90%, #0a0d12 0%, transparent 60%), #050505",
          }}
        />
        <div className="absolute inset-0 opacity-20 [background:repeating-linear-gradient(115deg,transparent_0,transparent_42px,rgba(255,255,255,0.06)_43px,transparent_44px)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="font-display text-lg font-black tracking-tight">
              SUPERCARS
            </span>
            <span className="size-1.5 rounded-full bg-apex-red" />
            <span className="font-display text-lg font-black tracking-tight">
              SHOWCASE
            </span>
          </Link>
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              Your personal garage
            </p>
            <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] tracking-tight">
              SAVE THE
              <br />
              MACHINES
              <br />
              <span className="text-white/35">YOU</span>{" "}
              <span className="text-apex-red">DREAM OF.</span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              Sign in to keep your favorite supercars close. Browse the archive,
              build your collection, and compare the fastest machines on earth.
              Your progress syncs across all your devices.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">
            Nothing for sale — just for the eyes
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-1.5">
              <span className="font-display text-base font-black tracking-tight">
                SUPERCARS
              </span>
              <span className="size-1.5 rounded-full bg-apex-red" />
              <span className="font-display text-base font-black tracking-tight">
                SHOWCASE
              </span>
            </Link>
            <Link
              to="/"
              className="text-xs uppercase tracking-[0.16em] text-white/50 hover:text-white"
            >
              Back
            </Link>
          </div>

          {/* ─── Username + Password Mode ─── */}
          {mode === "username" && (
            <>
              <h2 className="font-display text-3xl font-black tracking-tight">
                {flow === "signIn" ? "WELCOME BACK" : "CREATE ACCOUNT"}
              </h2>
              <p className="mt-2 text-sm text-apex-muted">
                {flow === "signIn"
                  ? "Sign in with your username and password."
                  : "Choose a username and password to get started."}
              </p>

              <form onSubmit={handleUsernameSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Username
                  </label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_username"
                      className="h-11 border-white/15 bg-black pl-10 text-white placeholder:text-white/30 focus:border-apex-red"
                      disabled={isLoading}
                      required
                      minLength={3}
                      maxLength={20}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 border-white/15 bg-black pl-10 text-white placeholder:text-white/30 focus:border-apex-red"
                      disabled={isLoading}
                      required
                      minLength={4}
                      autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-apex-red">{error}</p>}

                <Button
                  type="submit"
                  className="h-11 w-full bg-apex-red text-white hover:bg-apex-red-bright"
                  disabled={isLoading || username.length < 3 || password.length < 4}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : flow === "signIn" ? (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setFlow(flow === "signIn" ? "signUp" : "signIn"); setError(null); }}
                  disabled={isLoading}
                  className="w-full text-white/60 hover:bg-transparent hover:text-white"
                >
                  {flow === "signIn"
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Sign In"}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-apex-line" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                  Or
                </span>
                <span className="h-px flex-1 bg-apex-line" />
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-white/15 bg-transparent text-white hover:border-apex-red hover:bg-apex-red/10"
                  onClick={() => { setMode("email"); setError(null); }}
                  disabled={isLoading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Use Email Instead
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-white/15 bg-transparent text-white hover:border-apex-red hover:bg-apex-red/10"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Continue as Guest
                </Button>
              </div>
            </>
          )}

          {/* ─── Email OTP Mode ─── */}
          {mode === "email" && !otpSent && (
            <>
              <h2 className="font-display text-3xl font-black tracking-tight">
                SIGN IN WITH EMAIL
              </h2>
              <p className="mt-2 text-sm text-apex-muted">
                Enter your email to receive a verification code.
              </p>

              <form onSubmit={handleEmailSubmit} className="mt-8">
                <label className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Email address
                </label>
                <div className="relative mt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                    <Input
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="h-11 border-white/15 bg-black pl-10 text-white placeholder:text-white/30 focus:border-apex-red"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0 bg-apex-red text-white hover:bg-apex-red-bright"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && <p className="mt-3 text-sm text-apex-red">{error}</p>}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setMode("username"); setError(null); }}
                  disabled={isLoading}
                  className="mt-4 w-full text-white/60 hover:bg-transparent hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Username & Password
                </Button>
              </form>
            </>
          )}

          {/* ─── Email OTP Verification ─── */}
          {mode === "email" && otpSent && (
            <>
              <h2 className="font-display text-3xl font-black tracking-tight">
                CHECK YOUR EMAIL
              </h2>
              <p className="mt-2 text-sm text-apex-muted">
                We&apos;ve sent a verification code to{" "}
                <span className="text-white">{otpEmail}</span>.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-8">
                <input type="hidden" name="email" value={otpEmail} />
                <input type="hidden" name="code" value={otp} />

                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                        const form = (e.target as HTMLElement).closest("form");
                        if (form) form.requestSubmit();
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="border-white/15 bg-black text-white"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="mt-3 text-center text-sm text-apex-red">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="mt-8 h-11 w-full bg-apex-red text-white hover:bg-apex-red-bright"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setOtpSent(false); setOtp(""); setError(null); }}
                  disabled={isLoading}
                  className="mt-3 w-full text-white/60 hover:bg-transparent hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Use a different email
                </Button>
              </form>
            </>
          )}

          <p className="mt-10 text-center text-xs text-white/30">
            Your progress syncs across devices · Supercars Showcase
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
