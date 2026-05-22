import { Link } from "@tanstack/react-router";
import {
  MapPin,
  BatteryCharging,
  ChevronRight,
  ShieldCheck,
  Clock,
  Mail,
  Phone,
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Zap,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";

export function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#FAFAFA] text-[#242426] overflow-x-hidden selection:bg-[#C64F38] selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto border-b border-[#D1D1D1]">
        <div className="flex items-center gap-3">
          <div className="bg-[#242426] p-2 rounded-[4px] border border-[#242426]">
            <FontAwesomeIcon icon={faChargingStation} className="h-5 w-5 text-white" />
          </div>
          <span
            className="text-xl font-bold tracking-tight text-[#242426] font-['Space_Grotesk'] uppercase"
          >
            EvGenee
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth/login">
            <button className="text-[#4A6163] hover:text-[#242426] text-sm font-semibold transition-colors px-4 py-2 uppercase tracking-wider font-['Space_Grotesk'] cursor-pointer">
              Log in
            </button>
          </Link>
          <Link to="/auth/register">
            <button className="bg-[#242426] hover:bg-[#4A6163] text-white text-sm font-bold px-6 py-2.5 rounded-[4px] border border-[#242426] transition-colors uppercase tracking-wider font-['Space_Grotesk'] cursor-pointer">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="relative z-10">
        <section className="px-6 pt-20 pb-16 max-w-7xl mx-auto">
          <p
            className="text-[#C64F38] text-xs font-bold tracking-[0.25em] uppercase mb-8 font-['Space_Grotesk']"
          >
            EV Emergency & Charging Network · India
          </p>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-start mb-16">
            <div>
              <h1
                className="text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[1.05] tracking-tight text-[#242426] font-['Space_Grotesk']"
              >
                Charge Smarter.<br />
                <span className="text-[#C64F38]">Drive without limits.</span>
              </h1>
            </div>

            <div className="lg:pt-4 border-l border-[#D1D1D1] lg:pl-10">
              <p className="text-[#4A6163] text-lg leading-relaxed mb-8">
                The ultra-premium emergency charging companion. Secure a high-speed slot in under 60 seconds, or dispatch emergency roadside SOS when stranded. Zero anxiety, pure utility.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth/register" className="flex-1 sm:flex-initial">
                  <button className="flex items-center gap-2 bg-[#242426] hover:bg-[#4A6163] text-white text-sm font-bold px-8 py-3.5 rounded-[4px] transition-colors uppercase tracking-wider font-['Space_Grotesk'] justify-center w-full cursor-pointer">
                    Find Chargers Near Me
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link to="/sos" className="flex-1 sm:flex-initial">
                  <button className="flex items-center gap-2 bg-transparent hover:bg-[#F2F2F2] text-[#C64F38] border border-[#C64F38] text-sm font-bold px-8 py-3.5 rounded-[4px] transition-all uppercase tracking-wider font-['Space_Grotesk'] justify-center w-full cursor-pointer">
                    Emergency SOS
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="relative rounded-[4px] overflow-hidden border border-[#D1D1D1] bg-[#F5F5F5] p-2">
            <img
              src="/evStation.jpeg"
              alt="EvGenee premium charging terminal"
              className="w-full h-[400px] sm:h-[520px] object-cover rounded-[2px]"
            />
            <div className="absolute bottom-6 left-6 right-6 px-6 py-4 flex items-center justify-between bg-white/95 backdrop-blur-md border border-[#D1D1D1] rounded-[4px]">
              <div>
                <p className="text-[#242426] text-xs font-bold tracking-widest uppercase font-['Space_Grotesk']">
                  Terminal Active
                </p>
              </div>
              <div className="flex items-center gap-2 text-[#4A6163] text-xs font-semibold uppercase tracking-wider font-['Space_Grotesk']">
                <span className="h-2 w-2 rounded-full bg-[#C64F38] inline-block animate-pulse" />
                Live Network Status
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ──────────────────────────────────────────── */}
        <section className="border-y border-[#D1D1D1] py-12 px-6 max-w-7xl mx-auto bg-white">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "50+", label: "Cities Covered" },
              { value: "2,400+", label: "Active Chargers" },
              { value: "98.9%", label: "Uptime SLA" },
              { value: "<60s", label: "Average Dispatch" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center lg:text-left">
                <p className="text-4xl font-bold mb-1 text-[#242426] font-['Space_Grotesk']">
                  {value}
                </p>
                <p className="text-[#4A6163] text-xs tracking-widest uppercase font-semibold font-['Space_Grotesk']">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────── */}
        <section className="py-28 px-6 max-w-7xl mx-auto">
          <p className="text-[#C64F38] text-xs font-bold tracking-[0.25em] uppercase mb-4 font-['Space_Grotesk']">
            Engineered For Reliability
          </p>
          <h2 className="text-4xl font-bold text-[#242426] mb-16 font-['Space_Grotesk']">
            No Gimmicks. Just Infrastructure.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                icon: <MapPin className="h-5 w-5 text-white" />,
                title: "Real-time Telemetry",
                desc: "Live sync directly with charger hardware. You know it's online and vacant before you arrive.",
              },
              {
                num: "02",
                icon: <Clock className="h-5 w-5 text-white" />,
                title: "Guaranteed Booking",
                desc: "Reserve your charger up to 30 minutes in advance. The slot is held exclusively for your vehicle.",
              },
              {
                num: "03",
                icon: <ShieldCheck className="h-5 w-5 text-white" />,
                title: "Emergency Roadside SOS",
                desc: "Stranded with zero charge? Tap SOS to instantly route the nearest mobile recovery unit to your exact location.",
              },
            ].map(({ num, icon, title, desc }) => (
              <div
                key={num}
                className="bg-white border border-[#D1D1D1] rounded-[4px] p-8 hover:border-[#242426] transition-all duration-300"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="bg-[#242426] p-3 rounded-[4px]">
                    {icon}
                  </div>
                  <span className="text-[#C64F38] font-bold text-lg font-['Space_Grotesk']">
                    {num}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#242426] mb-4 font-['Space_Grotesk']">
                  {title}
                </h3>
                <p className="text-[#4A6163] text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────── */}
        <section className="py-28 px-6 max-w-7xl mx-auto border-t border-[#D1D1D1]">
          <p className="text-[#C64F38] text-xs font-bold tracking-[0.25em] uppercase mb-4 font-['Space_Grotesk']">
            The Protocol
          </p>
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 items-end mb-16">
            <h2 className="text-4xl font-bold text-[#242426] font-['Space_Grotesk'] leading-tight">
              Three Steps To Absolute Continuity.
            </h2>
            <p className="text-[#4A6163] text-base leading-relaxed max-w-xl">
              We've stripped away the noise of typical apps. EvGenee operates with military efficiency to keep your journey moving forwards.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-[#D1D1D1] rounded-[4px] overflow-hidden border border-[#D1D1D1]">
            {[
              {
                num: "I",
                title: "Locate & Route",
                desc: "Identify ultra-fast charging stations along your path or summon emergency roadside assistance.",
              },
              {
                num: "II",
                title: "Pre-Book Slot",
                desc: "Secure the connector in one click. Our systems reserve the hardware and guide you straight in.",
              },
              {
                num: "III",
                title: "Charge & Resume",
                desc: "Plug in, watch high-speed delivery, and auto-settle the billing per-kWh. Zero friction, zero delay.",
              },
            ].map(({ num, title, desc }) => (
              <div
                key={num}
                className="bg-[#FAFAFA] p-8 hover:bg-white transition-colors duration-300"
              >
                <p className="text-5xl font-bold mb-6 text-[#C64F38] font-['Space_Grotesk']">
                  {num}
                </p>
                <h3 className="text-lg font-bold text-[#242426] mb-3 font-['Space_Grotesk']">
                  {title}
                </h3>
                <p className="text-[#4A6163] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="/auth/register">
              <button className="bg-[#242426] hover:bg-[#4A6163] text-white text-sm font-bold px-8 py-4 rounded-[4px] transition-colors uppercase tracking-wider font-['Space_Grotesk'] cursor-pointer">
                Get Started with EvGenee
              </button>
            </Link>
          </div>
        </section>

        {/* ── Map section ────────────────────────────────────────── */}
        <section className="px-6 py-28 max-w-7xl mx-auto border-t border-[#D1D1D1]">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#C64F38] text-xs font-bold tracking-[0.25em] uppercase mb-4 font-['Space_Grotesk']">
                Subcontinental Reach
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#242426] mb-6 leading-tight font-['Space_Grotesk']">
                Expanding With Asymmetry.
              </h2>
              <p className="text-[#4A6163] text-base leading-relaxed mb-8">
                From high-density tech corridors to arterial highways, we install charging architecture where you actually need it. No cosmetic coverage; pure geographical utility.
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <h4 className="text-2xl font-bold text-[#242426] font-['Space_Grotesk']">28 States</h4>
                  <p className="text-xs text-[#4A6163] uppercase tracking-wider font-semibold font-['Space_Grotesk']">Active Coverage</p>
                </div>
                <div className="w-px h-8 bg-[#D1D1D1]" />
                <div>
                  <h4 className="text-2xl font-bold text-[#242426] font-['Space_Grotesk']">150+ Hubs</h4>
                  <p className="text-xs text-[#4A6163] uppercase tracking-wider font-semibold font-['Space_Grotesk']">Built This Quarter</p>
                </div>
              </div>
            </div>
            <div className="relative rounded-[4px] overflow-hidden border border-[#D1D1D1] bg-white p-2">
              <img
                src="/india-map.png"
                alt="EvGenee network map of India"
                className="w-full object-cover rounded-[2px]"
              />
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <section className="px-6 pb-32 max-w-7xl mx-auto">
          <div className="relative rounded-[4px] overflow-hidden border border-[#D1D1D1] bg-[#242426] p-12 sm:p-20">
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
              <div className="max-w-2xl">
                <p className="text-[#C64F38] text-xs font-bold tracking-[0.25em] uppercase mb-4 font-['Space_Grotesk']">
                  Join The Network
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight font-['Space_Grotesk']">
                  Your Journey. Fully Charged.
                </h2>
                <p className="text-neutral-400 text-sm mt-4 leading-relaxed">
                  Join thousands of premium EV drivers who rely on EvGenee for absolute uptime and rapid roadside emergency rescue.
                </p>
              </div>
              <Link to="/auth/register" className="shrink-0 w-full sm:w-auto">
                <button className="bg-white hover:bg-[#FAFAFA] text-[#242426] font-bold px-8 py-4 rounded-[4px] transition-colors text-base uppercase tracking-wider font-['Space_Grotesk'] w-full sm:w-auto cursor-pointer">
                  Create Account
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#D1D1D1] pt-20 pb-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 lg:col-span-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#242426] p-2 rounded-[4px] border border-[#242426]">
                  <FontAwesomeIcon icon={faChargingStation} className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-[#242426] font-['Space_Grotesk'] uppercase tracking-wider">
                  EvGenee
                </span>
              </div>
              <p className="text-[#4A6163] text-sm leading-relaxed">
                India's elite EV charging infrastructure and emergency SOS response. Designed for drivers who refuse to compromise on uptime.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: <Twitter className="h-4 w-4" />, href: "#" },
                  { icon: <Linkedin className="h-4 w-4" />, href: "#" },
                  { icon: <Instagram className="h-4 w-4" />, href: "#" },
                  { icon: <Github className="h-4 w-4" />, href: "#" },
                ].map(({ icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    className="h-9 w-9 rounded-[4px] border border-[#D1D1D1] flex items-center justify-center text-[#4A6163] hover:text-[#242426] hover:border-[#242426] transition-colors"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {[
              {
                heading: "Infrastructure",
                links: ["Superchargers", "Station Locator", "Network Pricing", "Corporate Fleet"],
              },
              {
                heading: "Company",
                links: ["Our Mission", "Partners", "Careers", "Pressroom"],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <p className="text-[#242426] text-xs tracking-widest uppercase mb-6 font-bold font-['Space_Grotesk']">
                  {heading}
                </p>
                <ul className="space-y-4">
                  {links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-[#4A6163] text-sm hover:text-[#242426] transition-colors font-medium"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <p className="text-[#242426] text-xs tracking-widest uppercase mb-6 font-bold font-['Space_Grotesk']">
                Contact
              </p>
              <ul className="space-y-4">
                {[
                  { icon: <Mail className="h-3.5 w-3.5" />, text: "dispatch@evgenee.in" },
                  { icon: <Phone className="h-3.5 w-3.5" />, text: "+91 79095 47056" },
                  { icon: <MapPin className="h-3.5 w-3.5" />, text: "New Delhi, India" },
                ].map(({ icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-2.5 text-[#4A6163] text-sm hover:text-[#242426] transition-colors cursor-pointer font-medium"
                  >
                    <span className="text-[#C64F38]">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#D1D1D1] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[#4A6163] text-xs font-semibold font-['Space_Grotesk'] uppercase tracking-wider">
              © {new Date().getFullYear()} EvGenee Infrastructure Pvt. Ltd.
            </p>
            <div className="flex gap-6 text-[#4A6163] text-xs font-semibold font-['Space_Grotesk'] uppercase tracking-wider">
              {["Privacy", "Terms", "Cookies"].map((l) => (
                <a key={l} href="#" className="hover:text-[#242426] transition-colors">
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
