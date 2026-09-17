import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, PiggyBank, Calendar, CreditCard, BookOpen, BarChart3,
  Check, ChevronDown, Menu, X, Globe,
  ArrowRight, Shield, Smartphone, Star, Sparkles,
} from "lucide-react";
import imgPlayStore from "@/imports/MacBookPro141/88b9df5eb5bdd63e4273c402c2c65973540fd514.png";
import imgLogoIcon from "@/imports/MacBookPro141/699240ac7265fd30698f4cbddf52104368a7a9f7.png";
import { imgVector } from "@/imports/MacBookPro141/svg-opo0u";
import imgHomeScreen from "@/imports/home.png";
import imgMembers from "@/imports/members.png";
import imgPayments from "@/imports/payments.png";
import imgLoans from "@/imports/loans.png";
import imgLedger from "@/imports/ledger.png";
import imgMeetings from "@/imports/meetings.png";
import imgReports from "@/imports/reports.png";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChapterId = "members" | "savings" | "meetings" | "loans" | "ledger" | "reports";

/** A figure lifted straight from the chapter's screenshot — never invented. */
interface Annotation {
  /** Which side of the device the note sits on. */
  side: "left" | "right";
  /** Vertical position as a percentage of the device height. */
  topPercent: number;
  /** The figure, exactly as the app shows it. */
  value: string;
  /** What that figure is, in the app's own words. */
  label: string;
}

interface Chapter {
  id: ChapterId;
  label: string;
  headline: string;
  accent: string;
  body: string;
  Icon: typeof Users;
  benefits: string[];
  annotations: Annotation[];
  screenshot?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHAPTERS: Chapter[] = [
  {
    id: "members",
    label: "Member Management",
    headline: "Every member,",
    accent: "in one place.",
    body: "Profiles, roles, and savings status stay together in one shared record.",
    Icon: Users,
    benefits: ["Manage member profiles", "See roles and savings status", "Add members as the group grows"],
    screenshot: imgMembers,
    annotations: [
      { side: "left", topPercent: 16, value: "12", label: "active members" },
      { side: "right", topPercent: 46, value: "2 · 10", label: "leadership · members" },
    ],
  },
  {
    id: "savings",
    label: "Savings Collection",
    headline: "Every rupee,",
    accent: "recorded instantly.",
    body: "Tap a member to record their payment. The group total updates as you go.",
    Icon: PiggyBank,
    benefits: ["Record monthly savings", "Track who has paid", "Keep collection history"],
    screenshot: imgPayments,
    annotations: [
      { side: "left", topPercent: 15, value: "₹52,300", label: "total paid today" },
      { side: "right", topPercent: 45, value: "12 of 12", label: "members paid" },
    ],
  },
  {
    id: "meetings",
    label: "Group Meetings",
    headline: "Meetings,",
    accent: "without paperwork.",
    body: "Start the monthly meeting and work through attendance, savings, and loans in one guided flow.",
    Icon: Calendar,
    benefits: ["Start the monthly meeting", "Work through each step in order", "Keep a record of every meeting"],
    screenshot: imgMeetings,
    annotations: [
      { side: "left", topPercent: 10, value: "September 2026", label: "monthly meeting" },
    ],
  },
  {
    id: "loans",
    label: "Loan Management",
    headline: "Every loan,",
    accent: "always visible.",
    body: "Create and manage loans from the group's own savings, visible to everyone.",
    Icon: CreditCard,
    benefits: ["Track active loans", "Record repayments", "See outstanding balances"],
    screenshot: imgLoans,
    annotations: [
      { side: "left", topPercent: 16, value: "1", label: "active loan" },
      { side: "right", topPercent: 44, value: "₹1,00,000", label: "outstanding" },
    ],
  },
  {
    id: "ledger",
    label: "Group Ledger",
    headline: "Everything,",
    accent: "always balanced.",
    body: "Personal and group ledgers side by side, with the balances worked out for you.",
    Icon: BookOpen,
    benefits: ["Track group transactions", "See closing and previous balances", "Keep the financial record organised"],
    screenshot: imgLedger,
    annotations: [
      { side: "left", topPercent: 15, value: "₹2,65,726", label: "closing balance" },
      { side: "right", topPercent: 46, value: "₹52,300", label: "total collected" },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    headline: "Know your group,",
    accent: "at a glance.",
    body: "Export the group's data, or open a savings, members, or loans report — then share it straight from the phone.",
    Icon: BarChart3,
    benefits: ["Export members, loans, savings, and meetings", "Open savings, members, or loan reports", "Share or save the file from your phone"],
    screenshot: imgReports,
    annotations: [],
  },
];

const FAQS = [
  {
    q: "Is Ozey SHG free to use?",
    a: "Yes, Ozey SHG is free for all Self Help Groups. There are no hidden charges for managing members, savings, or meetings.",
  },
  {
    q: "Does it work without the internet?",
    a: "Core features work offline. Data syncs automatically when you reconnect. Designed for areas with patchy connectivity.",
  },
  {
    q: "Is it available in Hindi and regional languages?",
    a: "Yes. Ozey SHG supports Hindi and several regional Indian languages so every member can use it comfortably.",
  },
  {
    q: "Can the bank see our records?",
    a: "You control your records. You can generate a bank-ready report and share it when needed — nothing is shared without your permission.",
  },
  {
    q: "What if a member does not have a smartphone?",
    a: "The President or Secretary can manage records for all members. Members receive updates via SMS. Works on any Android phone.",
  },
];

const STATS = [
  { value: "2,400+", label: "SHGs using Ozey" },
  { value: "58,000+", label: "Women empowered" },
  { value: "₹4.2 Cr+", label: "Savings tracked" },
  { value: "12,000+", label: "Meetings recorded" },
];

// ─── Background ───────────────────────────────────────────────────────────────

function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 }}>
        <defs>
          <pattern id="ruling" width="100%" height="70" patternUnits="userSpaceOnUse">
            <line x1="0" y1="69.5" x2="100%" y2="69.5" stroke="#C4C2BC" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ruling)" />
        <line x1="70" y1="0" x2="70" y2="100%" stroke="#C4C2BC" strokeWidth="0.8" opacity="0.6" />
      </svg>
      <div className="absolute rounded-full" style={{ width: 700, height: 700, top: "5%", left: "35%", background: "radial-gradient(circle, rgba(0,166,151,0.18) 0%, transparent 70%)" }} />
      <div className="absolute rounded-full" style={{ width: 600, height: 600, top: "8%", right: "0%", background: "radial-gradient(circle, rgba(255,218,169,0.55) 0%, transparent 70%)" }} />
      <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: "10%", left: "5%", background: "radial-gradient(circle, rgba(0,166,151,0.12) 0%, transparent 70%)" }} />
    </div>
  );
}

// ─── Routing ──────────────────────────────────────────────────────────────────

// Two pages, so the History API is enough. react-router is in package.json but
// unused, and pulling a router in for one route would be more moving parts than
// the site needs. BASE keeps this working when the site is served from a
// sub-path (a preview build) rather than the domain root.
type Route = "/" | "/privacy-policy";

const PRIVACY_PATH = "/privacy-policy";

const BASE = window.location.pathname.replace(/\/+$/, "").replace(/\/privacy-policy$/, "");

function routeOf(pathname: string): Route {
  return pathname.replace(/\/+$/, "").endsWith(PRIVACY_PATH) ? PRIVACY_PATH : "/";
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => routeOf(window.location.pathname));

  useEffect(() => {
    // Back/forward must land on the right page.
    const onPop = () => setRoute(routeOf(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to: Route) => {
    if (to === routeOf(window.location.pathname)) return;
    window.history.pushState({}, "", to === "/" ? BASE + "/" : BASE + PRIVACY_PATH);
    setRoute(to);
    window.scrollTo(0, 0);
  };

  return { route, navigate };
}

type Nav = ReturnType<typeof useRoute>;

/** Jump to an anchor, returning home first when we are on another page. */
function useAnchor({ route, navigate }: Nav) {
  return (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const target = hash.replace("#", "");
    if (route !== "/") {
      navigate("/");
      // The homepage has to mount before its sections can be scrolled to.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = target && document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      }));
      return;
    }
    const el = target && document.getElementById(target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ nav }: { nav: Nav }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const anchor = useAnchor(nav);

  const links = [
    { label: "Product", href: "#product" },
    ...(SHOW_IMPACT ? [{ label: "Impact", href: "#impact" }] : []),
    { label: "Why SHG", href: "#roles" },
    { label: "FAQs", href: "#faq" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(255,253,245,0.96)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.06)" : "none" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <a href="#" onClick={anchor("#")} className="flex items-center gap-3 shrink-0">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 bg-[#00a697] rounded-2xl" />
              <div className="absolute inset-[13%] bg-[#ffedd5] rounded-xl" />
              <div className="absolute inset-[18%]" style={{ maskImage: `url("${imgVector}")`, maskSize: "cover", maskRepeat: "no-repeat" }}>
                <img src={imgLogoIcon} alt="" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[11px] text-[#64748b] font-medium tracking-wide">Ozey</span>
              <span className="text-lg font-bold text-[#1e293b] tracking-tight">SHG</span>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#1e293b]">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={anchor(l.href)} className="hover:text-[#00a697] transition-colors">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-sm font-medium text-[#1e293b] px-3 py-2 rounded-full hover:bg-[#00a697]/10 transition-colors">
              <Globe size={15} className="text-[#00a697]" />
              English
            </button>
            <a href="#download" onClick={anchor("#download")} className="flex items-center gap-2 bg-white border border-[#94a3b8] rounded-full px-5 py-2 text-sm font-medium text-[#1e293b] hover:border-[#1e293b] hover:shadow-sm transition-all">
              <img src={imgPlayStore} alt="" className="w-4 object-contain" style={{ height: 18 }} />
              Download
            </a>
          </div>

          <button className="md:hidden p-2 text-[#1e293b]" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[#e7e5e4] bg-[#fffdf5] px-6 py-5 flex flex-col gap-5">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-base font-medium text-[#1e293b]" onClick={(e) => { setMenuOpen(false); anchor(l.href)(e); }}>{l.label}</a>
          ))}
          <a href="#download" className="flex items-center gap-2 bg-white border border-[#94a3b8] rounded-full px-5 py-2.5 text-sm font-medium text-[#1e293b] w-fit" onClick={(e) => { setMenuOpen(false); anchor("#download")(e); }}>
            <img src={imgPlayStore} alt="" className="w-4 object-contain" style={{ height: 18 }} />
            Download
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Premium Phone Mockup ─────────────────────────────────────────────────────
// Screen is intentionally left blank for real screenshot replacement.

// direction: 1 = forward (scroll down → slide right-to-left), -1 = backward
const screenSlideVariants = {
  enter: (d: number) => ({ x: d >= 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (d: number) => ({ x: d >= 0 ? "-100%" : "100%" }),
};

// Crossfade used by the walkthrough: the app looks like it changes screens
// rather than being swiped sideways.
const screenFadeVariants = {
  enter: { opacity: 0, scale: 1.015 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.995 },
};

function PhoneMockup({ w = 260, h = 535, screenshot, hideIsland = false, direction = 1, screenTransition = "slide", placeholder }: { w?: number; h?: number; screenshot?: string; hideIsland?: boolean; direction?: number; screenTransition?: "slide" | "fade"; placeholder?: React.ReactNode }) {
  const isFade = screenTransition === "fade";
  const cornerR = Math.round(w * 0.125);
  const bezel = Math.max(3, Math.round(w * 0.012));
  const screenCornerR = cornerR - bezel - 1;
  const diIslandW = Math.round(w * 0.29);
  const diIslandH = Math.round(w * 0.076);

  return (
    <div className="relative select-none" style={{ width: w, height: h }}>

      {/* Outer shell */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: cornerR,
          background: "linear-gradient(160deg, #28282F 0%, #141419 45%, #0C0C11 100%)",
          boxShadow: [
            "0 0 0 1px rgba(255,255,255,0.07)",
            "inset 0 1px 0 rgba(255,255,255,0.09)",
            "inset 0 -1px 0 rgba(0,0,0,0.4)",
            "0 60px 140px rgba(0,0,0,0.55)",
            "0 24px 60px rgba(0,0,0,0.30)",
            "0 8px 20px rgba(0,0,0,0.20)",
            "0 2px 4px rgba(0,0,0,0.15)",
          ].join(", "),
        }}
      />

      {/* Top edge catchlight */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: 0,
          height: 1,
          borderRadius: `${cornerR}px ${cornerR}px 0 0`,
          background: "linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.10) 65%, transparent 92%)",
        }}
      />

      {/* Left side buttons */}
      {/* Silent toggle */}
      <div className="absolute" style={{ left: -2.5, top: "13%", width: 2.5, height: Math.round(h * 0.038), background: "linear-gradient(to right, #1C1C24, #252530)", borderRadius: "2px 0 0 2px", boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.07)" }} />
      {/* Volume up */}
      <div className="absolute" style={{ left: -2.5, top: "20%", width: 2.5, height: Math.round(h * 0.07), background: "linear-gradient(to right, #1C1C24, #252530)", borderRadius: "2px 0 0 2px", boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.07)" }} />
      {/* Volume down */}
      <div className="absolute" style={{ left: -2.5, top: "30%", width: 2.5, height: Math.round(h * 0.07), background: "linear-gradient(to right, #1C1C24, #252530)", borderRadius: "2px 0 0 2px", boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.07)" }} />

      {/* Right side button (power) */}
      <div className="absolute" style={{ right: -2.5, top: "24%", width: 2.5, height: Math.round(h * 0.1), background: "linear-gradient(to left, #1C1C24, #252530)", borderRadius: "0 2px 2px 0", boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.07)" }} />

      {/* Screen inset */}
      <div
        className="absolute overflow-hidden"
        style={{
          inset: bezel,
          borderRadius: screenCornerR,
          background: "#FFFFFF",
          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        {/* Dynamic Island — hidden when screenshot provides its own status bar */}
        {!hideIsland && (
          <div
            className="absolute z-10 left-1/2 -translate-x-1/2"
            style={{
              top: Math.round(h * 0.014),
              width: diIslandW,
              height: diIslandH,
              background: "#0A0A10",
              borderRadius: diIslandH,
            }}
          />
        )}

        {/* Screen — crossfades in the walkthrough, slides elsewhere */}
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#FFFFFF" }}>
          <AnimatePresence custom={direction} initial={false} mode="sync">
            <motion.div
              key={screenshot ?? "__blank__"}
              custom={direction}
              variants={isFade ? screenFadeVariants : screenSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: isFade ? 0.5 : 0.38,
                ease: isFade ? [0.22, 1, 0.36, 1] : [0.32, 0.72, 0, 1],
              }}
              className="absolute inset-0"
              style={{ willChange: "transform" }}
            >
              {screenshot
                ? <img src={screenshot} alt="" className="w-full h-full" style={{ display: "block", objectFit: "fill" }} />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>{placeholder}</div>
              }
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle bottom reflection */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: 0,
          height: 1,
          borderRadius: `0 0 ${cornerR}px ${cornerR}px`,
          background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.04) 50%, transparent 80%)",
        }}
      />
    </div>
  );
}

// ─── Floating Info Card ────────────────────────────────────────────────────────

/**
 * A quiet annotation pinned beside the device: one figure taken straight from
 * the screenshot, the app's own word for it, and a hairline tying it to the
 * screen. Deliberately not a card — the product stays the loudest thing here.
 */
function PhoneAnnotation({
  side,
  topPercent,
  value,
  label,
  delay = 0,
}: Annotation & { delay?: number }) {
  const isLeft = side === "left";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="absolute flex items-center pointer-events-none"
      style={{
        top: `${topPercent}%`,
        ...(isLeft ? { right: "100%" } : { left: "100%" }),
        flexDirection: isLeft ? "row" : "row-reverse",
      }}
    >
      <div
        className={`rounded-[10px] border border-[#e8edf2] bg-white/85 px-2.5 py-1.5 ${isLeft ? "text-right" : "text-left"}`}
        style={{ backdropFilter: "blur(4px)", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
      >
        <div className="text-[14px] font-semibold text-[#1e293b] leading-none whitespace-nowrap tabular-nums">
          {value}
        </div>
        <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-[#94a3b8] leading-none whitespace-nowrap">
          {label}
        </div>
      </div>
      {/* hairline connector into the screen */}
      <div style={{ width: 20, height: 1, background: "#d7dee6" }} />
    </motion.div>
  );
}

// ─── Google Play Mark ─────────────────────────────────────────────────────────

/**
 * The Google Play triangle, drawn as vector paths in its own four colours.
 * The PNG badge it replaces had to be washed to flat white with a brightness
 * filter to survive the dark button, which destroyed the mark. This scales
 * cleanly and keeps the brand colours on any background.
 */
function GooglePlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#00A0FF" d="M3.063 3.27a1.5 1.5 0 0 0-.5 1.12v15.22a1.5 1.5 0 0 0 .5 1.12l.08.08L11.7 12.1v-.2L3.14 3.19l-.08.08z" />
      <path fill="#FFCE00" d="M14.55 15.02 11.7 12.1v-.2l2.85-2.92.07.04 3.38 1.92c.97.55.97 1.44 0 1.99l-3.38 1.92-.07.04z" />
      <path fill="#FF3A44" d="M14.62 14.98 11.7 12l-8.64 8.73c.32.34.85.38 1.44.04l10.12-5.79z" />
      <path fill="#00E676" d="M14.62 9.02 4.5 3.23c-.59-.34-1.12-.3-1.44.04L11.7 12l2.92-2.98z" />
    </svg>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 px-4 flex flex-col items-center text-center min-h-screen justify-center" style={{ zIndex: 1 }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="inline-flex items-center gap-2 border border-[#f68712] rounded-full px-5 py-2 mb-8"
      >
        <Sparkles size={15} className="text-[#ef4444]" />
        <span className="text-sm font-medium text-[#1e293b]">Built for Self Help Groups</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="text-[40px] sm:text-[56px] font-medium text-[#1e293b] leading-tight tracking-tight max-w-2xl sm:max-w-4xl mx-auto mb-6"
      >
        Run your SHG with{" "}
        <span className="font-bold text-[#00a697]">Confidence</span>,<br />
        not paperwork.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="text-base text-[#475569] leading-relaxed max-w-md mx-auto mb-8"
      >
        Ozey SHG helps women-led Self Help Groups manage members, savings and loans
        in one shared, trusted record — visible to everyone.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-12 text-sm font-medium text-[#00a697]"
      >
        {["Works on any Android phone", "No training needed", "Bank-ready reports"].map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-[#00a697] flex items-center justify-center">
              <Check size={9} color="white" strokeWidth={3} />
            </div>
            {t}
          </div>
        ))}
      </motion.div>

      {/* Hero phone + floating cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(0,166,151,0.15) 0%, transparent 80%)", filter: "blur(20px)" }}
        />

        {/* Hero phone — sized to match 1080×2400 screenshot ratio (9:20) */}
        <div className="relative">
          <PhoneMockup w={260} h={570} screenshot={imgHomeScreen} hideIsland />
            {/* Notes taken from the dashboard actually on screen */}
            <div className="hidden sm:block">
              <PhoneAnnotation side="left" topPercent={20} value="₹5,28,000" label="total group savings" delay={0.9} />
              <PhoneAnnotation side="right" topPercent={45} value="6" label="loans active" delay={1.05} />
            </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="flex flex-wrap justify-center gap-3 mt-10"
        id="download"
      >
        <a
          href="#"
          className="flex items-center gap-2.5 bg-[#1e293b] text-white rounded-full px-7 py-3.5 text-sm font-semibold hover:bg-[#0f172a] transition-colors shadow-lg shadow-[#1e293b]/20"
        >
          <GooglePlayIcon size={20} />
          Download on Google Play
        </a>
        <a
          href="#product"
          className="flex items-center gap-2 border border-[#1e293b]/20 rounded-full px-6 py-3.5 text-sm font-semibold text-[#1e293b] hover:border-[#1e293b]/50 transition-colors"
        >
          See how it works <ArrowRight size={15} />
        </a>
      </motion.div>
    </section>
  );
}

// ─── Problem Section ──────────────────────────────────────────────────────────

function ProblemSection() {
  return (
    <section className="py-20 px-4" style={{ zIndex: 1, position: "relative" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">The Old Way</p>
          <h2 className="text-3xl sm:text-4xl font-medium text-[#1e293b] tracking-tight">
            Paper registers.<br />Manual calculations.<br /><span className="font-bold">No transparency.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { emoji: "📒", title: "Registers get lost", desc: "One missing notebook means months of records gone." },
            { emoji: "🧮", title: "Errors add up", desc: "Manual calculations lead to disputes and distrust." },
            { emoji: "🚫", title: "No one can verify", desc: "Members must trust the person holding the register." },
          ].map((p) => (
            <div key={p.title} className="bg-white/60 rounded-3xl p-6 border border-[#e2e8f0]">
              <div className="text-3xl mb-3">{p.emoji}</div>
              <div className="text-base font-semibold text-[#1e293b] mb-1">{p.title}</div>
              <div className="text-sm text-[#64748b] leading-relaxed">{p.desc}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-medium text-[#94a3b8]">Ozey SHG changes this</div>
            <div className="w-px h-12 bg-gradient-to-b from-[#94a3b8] to-[#00a697]" />
            <ArrowRight size={20} className="text-[#00a697] rotate-90" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            { emoji: "☁️", title: "Digital records", desc: "Every entry is saved instantly. Always accessible." },
            { emoji: "🔗", title: "Connected members", desc: "Everyone in the group sees the same information." },
            { emoji: "✅", title: "Automatic calculations", desc: "Totals, EMIs, and balances calculated in real time." },
          ].map((p) => (
            <div key={p.title} className="bg-[#00a697]/5 rounded-3xl p-6 border border-[#00a697]/15">
              <div className="text-3xl mb-3">{p.emoji}</div>
              <div className="text-base font-semibold text-[#1e293b] mb-1">{p.title}</div>
              <div className="text-sm text-[#475569] leading-relaxed">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Walkthrough ──────────────────────────────────────────────────────────────

function ChapterContent({ chapter, isActive, stepNum, innerRef }: {
  chapter: Chapter; isActive: boolean; stepNum: number;
  /** Desktop walkthrough measures this block to decide the active chapter. */
  innerRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    // Plain div, never animated. The explanatory copy is ordinary page content:
    // it reads at full contrast whether or not its chapter is the active one.
    // Only the phone beside it crossfades, because only the screen changes.
    <div ref={innerRef} className="w-full md:max-w-sm">
      {/* Step line */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[11px] font-mono font-bold tracking-widest" style={{ color: isActive ? "#00a697" : "#94a3b8", transition: "color 0.4s" }}>
          {String(stepNum).padStart(2, "0")}
        </span>
        <div className="h-px flex-1" style={{ background: isActive ? "#00a697" : "#e2e8f0", transition: "background 0.4s" }} />
        <span className="text-[11px] font-mono text-[#cbd5e1]">{String(CHAPTERS.length).padStart(2, "0")}</span>
      </div>

      <p className="text-[11px] font-bold text-[#00a697] uppercase tracking-widest mb-2">{chapter.label}</p>

      <h2
        className="font-medium text-[#1e293b] leading-[1.08] tracking-tight mb-4"
        style={{ fontSize: "clamp(30px, 8.2vw, 44px)" }}
      >
        {chapter.headline}<br />
        <span className="font-extrabold text-[#00a697]">{chapter.accent}</span>
      </h2>

      <p className="text-[15px] text-[#64748b] leading-relaxed mb-6 md:mb-7">{chapter.body}</p>

      <div className="space-y-3">
        {chapter.benefits.map((b) => (
          <div key={b} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#00a697] flex items-center justify-center shrink-0">
              <Check size={10} color="white" strokeWidth={3} />
            </div>
            <span className="text-sm font-medium text-[#475569]">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Soft stand-in for chapters whose real app screen has not been supplied yet. */
function ScreenPlaceholder({ chapter }: { chapter: Chapter }) {
  const { Icon } = chapter;
  return (
    <div className="flex flex-col items-center gap-3 opacity-[0.18]">
      <Icon size={44} className="text-[#00a697]" />
      <span className="text-[11px] font-semibold tracking-widest uppercase text-[#00a697]">{chapter.label}</span>
    </div>
  );
}

const NAV_H = 64; // fixed header is h-16

/** Community Impact is hidden. Flip to true to bring the section and its
  * nav/footer links back — the component and its data are left intact. */
const SHOW_IMPACT = false;

// ─── Desktop: sticky phone, the content drives the screen ─────────────────────

/** Reading line, as a fraction of the space below the nav. A chapter becomes
 *  active when its content block descends past this line. */
const ACTIVATE_AT = 0.42;

/** Deadband, in px. The content must clear the line by this much before the
 *  screen follows, so a nudge near a boundary never swaps the screenshot.
 *  Chapters sit ~92vh apart, so this is a small fraction of the travel. */
const ACTIVATE_HYSTERESIS = 90;

function DesktopWalkthrough() {
  const [activeIdx, setActiveIdx] = useState(0);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);
  const [vh, setVh] = useState(900);

  useEffect(() => {
    const calc = () => setVh(window.innerHeight);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // Whole device fits under the nav with breathing room; width follows the
  // 1080x2400 screen aspect so the frame is never clipped or squashed.
  const phoneH = Math.round(Math.min(680, Math.max(430, vh - 160)));
  const phoneW = Math.round((phoneH - 6) / SCREEN_RATIO + 6);

  useEffect(() => {
    // The screen follows the content, not the scroll position. On each frame,
    // the active chapter is the last one whose content block has descended
    // past the reading line — a single, ordered answer, so two chapters near a
    // boundary can never race each other the way overlapping observer entries
    // did. A change must additionally clear the deadband, which is what makes
    // a small scroll back and forth leave the screenshot alone.
    let frame = 0;

    const update = () => {
      frame = 0;
      const els = contentRefs.current;
      if (!els.length || !els[0]) return;

      const line = NAV_H + (window.innerHeight - NAV_H) * ACTIVATE_AT;

      let next = 0;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (el && el.getBoundingClientRect().top <= line) next = i;
      }

      const cur = activeRef.current;
      if (next === cur) return;

      // Going forward, the arriving chapter must have travelled past the line.
      // Going back, the current one must have retreated well below it. Either
      // way the move costs a deliberate scroll, not a nudge.
      const forward = next > cur;
      const probe = els[forward ? next : cur];
      if (!probe) return;
      const top = probe.getBoundingClientRect().top;
      const committed = forward
        ? top <= line - ACTIVATE_HYSTERESIS
        : top >= line + ACTIVATE_HYSTERESIS;

      if (committed) {
        activeRef.current = next;
        setActiveIdx(next);
      }
    };

    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const active = CHAPTERS[activeIdx];

  return (
    <div className="hidden md:block max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-2 gap-10 lg:gap-16">

        {/* Left — sticky device, vertically centred in the space below the nav */}
        <div
          className="sticky flex items-center justify-center"
          style={{ top: NAV_H, height: `calc(100vh - ${NAV_H}px)` }}
        >
          <div className="relative flex flex-col items-center gap-5">

            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[#94a3b8] tracking-widest">
                {String(activeIdx + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
              </span>
              <div className="flex gap-1.5">
                {CHAPTERS.map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full"
                    animate={{ width: activeIdx === i ? 20 : 6, background: activeIdx === i ? "#00a697" : "#cbd5e1" }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: 6 }}
                  />
                ))}
              </div>
            </div>

            {/* Phone — one fixed size for every chapter so it never jumps */}
            <div className="relative" style={{ width: phoneW }}>
              <PhoneMockup
                w={phoneW}
                h={phoneH}
                screenshot={active.screenshot}
                hideIsland={!!active.screenshot}
                screenTransition="fade"
                placeholder={<ScreenPlaceholder chapter={active} />}
              />

              {/* Notes drawn from the screen itself. Shown only where there
                  is room beside the device, so they never leave the viewport. */}
              <div className="hidden xl:block">
                <AnimatePresence mode="wait">
                  {active.annotations.slice(0, 3).map((a, i) => (
                    <PhoneAnnotation key={`${active.id}-${i}`} {...a} delay={0.08 + i * 0.08} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Active chapter label */}
            <motion.div
              key={`label-${activeIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-lg bg-[#00a697]/10 flex items-center justify-center">
                {(() => { const { Icon } = active; return <Icon size={13} className="text-[#00a697]" />; })()}
              </div>
              <span className="text-xs font-semibold text-[#94a3b8]">{active.label}</span>
            </motion.div>
          </div>
        </div>

        {/* Right — the story that drives the phone. The trailing space keeps
            the sticky column travelling while the last chapter is being read,
            so the phone never releases early. */}
        <div style={{ paddingBottom: "12vh" }}>
          {CHAPTERS.map((ch, i) => (
            <div key={ch.id} className="flex items-center" style={{ minHeight: "92vh" }}>
              <ChapterContent
                chapter={ch}
                isActive={activeIdx === i}
                stepNum={i + 1}
                innerRef={(el) => { contentRefs.current[i] = el; }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile: single column, each story owns its phone ─────────────────────────

const SCREEN_RATIO = 2400 / 1080;

function MobileWalkthrough() {
  const [phoneW, setPhoneW] = useState(242);

  useEffect(() => {
    const calc = () => {
      // clamp(210px, 62vw, 250px)
      const byWidth = Math.min(Math.max(window.innerWidth * 0.62, 210), 250);
      // Guard so a short viewport shrinks the device rather than clipping it.
      const byHeight = (window.innerHeight - NAV_H - 56 - 6) / SCREEN_RATIO + 6;
      setPhoneW(Math.round(Math.min(byWidth, byHeight)));
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
    };
  }, []);

  // Aspect ratio always derived, never fixed.
  const phoneH = Math.round((phoneW - 6) * SCREEN_RATIO) + 6;

  return (
    <div className="md:hidden" style={{ paddingInline: 20, overflowX: "clip" }}>
      {CHAPTERS.map((ch, i) => (
        // The whole block reveals as one unit, so the phone and the title it
        // belongs to always arrive together.
        <motion.article
          key={ch.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
          style={{ paddingTop: i === 0 ? 4 : 0, marginBottom: i === CHAPTERS.length - 1 ? 8 : 84 }}
        >
          {/* Chapter label */}
          <span className="text-[11px] font-mono font-bold tracking-widest text-[#94a3b8]">
            {String(i + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
          </span>
          <span className="mt-1.5 text-[11px] font-bold text-[#00a697] uppercase tracking-widest">
            {ch.label}
          </span>

          {/* Feature title — the hero line */}
          <h3
            className="mt-3.5 font-medium text-[#1e293b] tracking-tight"
            style={{ fontSize: "clamp(28px, 8vw, 36px)", lineHeight: 1.02 }}
          >
            {ch.headline}<br />
            <span className="font-extrabold text-[#00a697]">{ch.accent}</span>
          </h3>

          {/* The device is the visual hero of the block */}
          <div className="mt-8" style={{ maxWidth: "100%" }}>
            <PhoneMockup
              w={phoneW}
              h={phoneH}
              screenshot={ch.screenshot}
              hideIsland={!!ch.screenshot}
              placeholder={<ScreenPlaceholder chapter={ch} />}
            />
          </div>

          {/* Short supporting line, directly under the screen it describes */}
          <p className="mt-6 text-[15px] leading-relaxed text-[#64748b]" style={{ maxWidth: "34ch" }}>
            {ch.body}
          </p>
        </motion.article>
      ))}
    </div>
  );
}

function WalkthroughSection() {
  return (
    <section id="product" className="relative" style={{ zIndex: 1 }}>
      <div className="text-center pt-16 pb-8 px-4">
        <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">Interactive Walkthrough</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#1e293b] tracking-tight">
          Scroll to experience the app.
        </h2>
        <p className="text-[#64748b] mt-3 text-sm">Six features. One continuous demo.</p>
      </div>

      <DesktopWalkthrough />
      <MobileWalkthrough />
    </section>
  );
}

// ─── Impact Section ───────────────────────────────────────────────────────────

function ImpactSection() {
  return (
    <section id="impact" className="py-20 px-4" style={{ zIndex: 1, position: "relative" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">Community Impact</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e293b] tracking-tight">
            More trust.<br />Less paperwork.<br /><span className="text-[#00a697]">More confidence.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-16">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[#00a697] mb-1">{s.value}</div>
              <div className="text-sm text-[#64748b] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { quote: "Earlier I would spend the whole Sunday checking registers. Now it takes 5 minutes on Ozey.", name: "Sunita Devi", role: "SHG Secretary, Rajasthan" },
            { quote: "Every member can see their own savings. There are no more arguments about who paid what.", name: "Priya Sharma", role: "SHG President, Maharashtra" },
            { quote: "When I went to the bank for a loan, I showed them the Ozey report. They were very impressed.", name: "Anita Gupta", role: "SHG Member, Uttar Pradesh" },
          ].map((t) => (
            <div key={t.name} className="bg-white/70 rounded-3xl p-6 border border-[#e2e8f0] flex flex-col gap-4">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#f68712" stroke="none" />)}
              </div>
              <p className="text-sm text-[#475569] leading-relaxed flex-1">"{t.quote}"</p>
              <div>
                <div className="text-sm font-semibold text-[#1e293b]">{t.name}</div>
                <div className="text-xs text-[#94a3b8]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Roles Section ────────────────────────────────────────────────────────────

function RolesSection() {
  const roles = [
    {
      title: "President",
      emoji: "👩‍💼",
      color: "#00a697",
      bg: "#00a69710",
      capabilities: ["Manage all member profiles", "Approve and track loans", "Generate bank-ready reports", "View complete group ledger", "Record and review meetings"],
    },
    {
      title: "Secretary",
      emoji: "📋",
      color: "#1e293b",
      bg: "#1e293b0d",
      capabilities: ["Record monthly savings", "Take meeting attendance", "Add notes and minutes", "Track individual contributions", "Notify members via SMS"],
    },
    {
      title: "Member",
      emoji: "🌸",
      color: "#f68712",
      bg: "#f6871210",
      capabilities: ["View personal savings history", "Check loan status & EMI", "See group total in real time", "Access past meeting records", "Download personal statement"],
    },
  ];

  return (
    <section id="roles" className="py-20 px-4" style={{ zIndex: 1, position: "relative" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">Built for Every Role</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e293b] tracking-tight">
            One app. Every role. Everyone wins.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {roles.map((r) => (
            <div key={r.title} className="rounded-3xl p-7 border" style={{ background: r.bg, borderColor: r.color + "25" }}>
              <div className="text-4xl mb-4">{r.emoji}</div>
              <h3 className="text-xl font-bold mb-5" style={{ color: r.color }}>{r.title}</h3>
              <ul className="space-y-2.5">
                {r.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-[#475569]">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: r.color }}>
                      <Check size={11} color="white" strokeWidth={3} />
                    </div>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────────────

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 px-4" style={{ zIndex: 1, position: "relative" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">FAQs</p>
          <h2 className="text-3xl font-bold text-[#1e293b] tracking-tight">Questions answered.</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="bg-white/70 border border-[#e2e8f0] rounded-2xl overflow-hidden transition-all duration-300">
              <button className="w-full flex items-center justify-between px-6 py-5 text-left gap-4" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <span className="text-base font-semibold text-[#1e293b]">{f.q}</span>
                <div className="shrink-0 text-[#94a3b8] transition-transform duration-300" style={{ transform: openIdx === i ? "rotate(180deg)" : "none" }}>
                  <ChevronDown size={20} />
                </div>
              </button>
              {openIdx === i && (
                <div className="px-6 pb-5 text-sm text-[#64748b] leading-relaxed border-t border-[#f1f5f9] pt-4">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-20 px-4" style={{ zIndex: 1, position: "relative" }}>
      <div className="max-w-2xl mx-auto text-center">
        <div className="rounded-4xl p-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #00a697 0%, #009186 60%, #007a6f 100%)" }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15" style={{ background: "radial-gradient(circle, rgba(255,218,169,0.5) 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <div className="text-4xl mb-5">🌟</div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Start your SHG's digital journey today.</h2>
            <p className="text-[#b3ede9] text-base leading-relaxed mb-8 max-w-md mx-auto">
              Free for all SHGs. Works on any Android phone. No training needed. Trusted by thousands of women across India.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="#" className="flex items-center gap-2.5 bg-white text-[#1e293b] rounded-full px-7 py-3.5 text-sm font-semibold hover:bg-[#f8fafc] transition-colors shadow-lg">
                <img src={imgPlayStore} alt="" className="w-5 object-contain" style={{ height: 22 }} />
                Download Free on Google Play
              </a>
            </div>
            <div className="mt-5 flex justify-center gap-6 text-[#b3ede9] text-xs font-medium">
              <span className="flex items-center gap-1"><Shield size={12} /> 100% Free</span>
              <span className="flex items-center gap-1"><Smartphone size={12} /> Android Ready</span>
              <span className="flex items-center gap-1"><Check size={12} strokeWidth={3} /> Bank Approved</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ nav }: { nav: Nav }) {
  const anchor = useAnchor(nav);
  return (
    <footer className="border-t border-[#e7e5e4] py-10 px-4" style={{ zIndex: 1, position: "relative" }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-[#00a697] rounded-xl" />
            <div className="absolute inset-[12%] bg-[#ffedd5] rounded-lg" />
            <div className="absolute inset-[18%]" style={{ maskImage: `url("${imgVector}")`, maskSize: "cover", maskRepeat: "no-repeat" }}>
              <img src={imgLogoIcon} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <div className="text-xs text-[#64748b]">Ozey</div>
            <div className="text-base font-bold text-[#1e293b] leading-none">SHG</div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#64748b] font-medium">
          <a href="#product" onClick={anchor("#product")} className="hover:text-[#00a697] transition-colors">Product</a>
          {SHOW_IMPACT && <a href="#impact" onClick={anchor("#impact")} className="hover:text-[#00a697] transition-colors">Impact</a>}
          <a href="#faq" onClick={anchor("#faq")} className="hover:text-[#00a697] transition-colors">FAQ</a>
          <a
            href={BASE + PRIVACY_PATH}
            onClick={(e) => { e.preventDefault(); nav.navigate(PRIVACY_PATH); }}
            className="hover:text-[#00a697] transition-colors"
          >
            Privacy Policy
          </a>
        </div>
        <div className="text-xs text-[#94a3b8]">© 2025 Ozey. Built for Indian SHGs.</div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const nav = useRoute();

  return (
    <div className="min-h-screen overflow-x-clip" style={{ fontFamily: "'Inter', sans-serif", background: "#fffdf5" }}>
      <Background />
      <Navbar nav={nav} />
      <main style={{ position: "relative", zIndex: 1 }}>
        {nav.route === PRIVACY_PATH ? (
          <PrivacyPolicyPage />
        ) : (
          <>
            <HeroSection />
            <ProblemSection />
            <WalkthroughSection />
            {SHOW_IMPACT && <ImpactSection />}
            <RolesSection />
            <FAQSection />
            <CTASection />
          </>
        )}
      </main>
      <Footer nav={nav} />
    </div>
  );
}
