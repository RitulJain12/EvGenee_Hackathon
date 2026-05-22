import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AuthAPI, tokenStore } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2, Lock, Mail, KeyRound } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth/forgot-password")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && tokenStore.get()) {
      throw redirect({ to: "/" });
    }
  },
  component: ForgotPasswordPage,
});

type Step = "REQUEST" | "VERIFY" | "RESET" | "SUCCESS";

function ForgotPasswordPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthAPI.forgotPassword({ email });
      toast.success("OTP sent to your email!");
      setStep("VERIFY");
    } catch (err) {
      toast.error(getApiError(err, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthAPI.verifyOTP({ email, otp });
      toast.success("OTP verified!");
      setStep("RESET");
    } catch (err) {
      toast.error(getApiError(err, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await AuthAPI.resetPassword({ email, otp, password });
      toast.success("Password reset successful!");
      setStep("SUCCESS");
    } catch (err) {
      toast.error(getApiError(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 overflow-hidden relative text-[#242426]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Project Texture */}
      <div
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/auth/login" className="inline-flex items-center gap-2 text-[#4A6163] hover:text-[#242426] font-space uppercase text-[10px] font-bold tracking-wider mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 text-[#4A6163]" /> Back to Login
          </Link>
          <div className="inline-flex h-14 w-14 rounded-[4px] bg-white border border-[#D1D1D1] items-center justify-center mb-4 shadow-sm">
            <FontAwesomeIcon icon={faChargingStation} className="h-6 w-6 text-[#C64F38]" />
          </div>
          <h1 className="text-2xl font-bold text-[#242426] tracking-tight uppercase font-space mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {step === "REQUEST" && "Forgot Password?"}
            {step === "VERIFY" && "Verify OTP"}
            {step === "RESET" && "Set New Password"}
            {step === "SUCCESS" && "All Set!"}
          </h1>
          <p className="text-[#4A6163] text-[10px] font-bold uppercase tracking-wider font-space max-w-[280px] mx-auto">
            {step === "REQUEST" && "Enter your email to receive a 6-digit verification code."}
            {step === "VERIFY" && `We've sent a code to ${email}`}
            {step === "RESET" && "Choose a strong password to secure your account."}
            {step === "SUCCESS" && "Your password has been successfully updated."}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-8 shadow-sm relative overflow-hidden">
          {/* Step 1: Request */}
          {step === "REQUEST" && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#4A6163]" /> Email Address
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-11 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11 bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm active:scale-[0.98] flex items-center justify-center"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Send Code"}
              </Button>
            </form>
          )}

          {/* Step 2: Verify */}
          {step === "VERIFY" && (
            <form onSubmit={handleVerifyOTP} className="space-y-6 flex flex-col items-center">
              <div className="space-y-4 w-full flex flex-col items-center">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1 flex items-center gap-1.5 self-start">
                  <KeyRound className="h-3.5 w-3.5 text-[#4A6163]" /> 6-Digit Code
                </Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  pattern={REGEXP_ONLY_DIGITS}
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-11 h-14 bg-[#FAF9F6] border border-[#D1D1D1] text-lg font-bold rounded-[4px] text-[#C64F38] focus:ring-[#C64F38]/20 focus:border-[#C64F38] font-space"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="w-full space-y-4">
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-11 bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm flex items-center justify-center"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Verify Code"}
                </Button>
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  className="w-full text-center text-[10px] text-[#C64F38] hover:text-[#B53F29] font-bold uppercase tracking-wider font-space transition-colors"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#4A6163]" /> New Password
                  </Label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-11 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#4A6163]" /> Confirm Password
                  </Label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-11 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !password || password !== confirmPassword}
                className="w-full h-11 bg-[#C64F38] hover:bg-[#B53F29] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm flex items-center justify-center"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Reset Password"}
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "SUCCESS" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-[#E2F3EC] border border-[#CDECE0] rounded-[4px] flex items-center justify-center mx-auto text-[#0F9F59]">
                <CheckCircle2 className="h-8 w-8 text-[#0F9F59]" />
              </div>
              <Button
                onClick={() => nav({ to: "/auth/login" })}
                className="w-full h-11 bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm flex items-center justify-center"
              >
                Sign In Now
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#4A6163] mt-8 uppercase font-bold tracking-wider font-space">
          Secure and private charging network by <span className="text-[#242426]">EvGenee</span>
        </p>
      </div>
    </div>
  );
}
