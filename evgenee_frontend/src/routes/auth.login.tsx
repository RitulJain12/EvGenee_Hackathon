import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";
import { tokenStore } from "@/lib/api";

export const Route = createFileRoute("/auth/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && tokenStore.get()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      nav({ to: "/" });
    } catch (err) {
      toast.error(getApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 overflow-hidden relative"
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

      {/* Project Glows */}
      <div
        className="fixed top-0 left-0 w-[600px] h-[500px] pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse at 0% 0%, rgba(198,79,56,0.05) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 w-[500px] h-[500px] pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse at 100% 100%, rgba(74,97,99,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-[4px] bg-white border border-[#D1D1D1] items-center justify-center mb-4 shadow-sm">
            <FontAwesomeIcon icon={faChargingStation} className="h-6 w-6 text-[#C64F38]" />
          </div>
          <h1 className="text-2xl font-bold text-[#242426] tracking-tight uppercase font-space mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            EvGenee
          </h1>
          <p className="text-[#4A6163] text-[10px] font-bold uppercase tracking-wider font-space">Welcome back. Sign in to your account.</p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={submit}
          className="bg-white border border-[#D1D1D1] rounded-[4px] p-8 space-y-5 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-11 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Password</Label>
                <Link
                  to="/auth/forgot-password"
                  className="text-[10px] font-bold text-[#C64F38] hover:text-[#B53F29] uppercase tracking-wider transition-colors font-space"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-11 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A6163]/60 hover:text-[#242426] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm active:scale-[0.98] flex items-center justify-center"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Sign In"}
          </Button>

          <p className="text-center text-xs font-medium text-[#4A6163]">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-[#C64F38] font-bold hover:text-[#B53F29] transition-colors font-space uppercase text-[10px] ml-0.5 tracking-wider">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
