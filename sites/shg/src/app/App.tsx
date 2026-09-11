import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, PiggyBank, Calendar, CreditCard, BookOpen, BarChart3,
  Check, TrendingUp, ChevronDown, Menu, X, Globe,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ChapterId = "members" | "savings" | "meetings" | "loans" | "ledger" | "reports";

interface Chapter {
  id: ChapterId;
  label: string;
  headline: string;
  accent: string;
  body: string;
  Icon: typeof Users;
  benefits: string[];
  floatingCards: FloatingCardData[];
  screenshot?: string;
}

interface FloatingCardData {
  side: "left" | "right";
  topPercent: number;
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHAPTERS: Chapter[] = [
  {
    id: "members",
    label: "Member Management",
    headline: "Every member,",
    accent: "in one place.",
    body: "All 24 profiles, savings history, and contact details in one shared record everyone trusts.",
    Icon: Users,
    benefits: ["24 profiles, always current", "Roles and savings unified", "New member added in seconds"],
    screenshot: imgMembers,
    floatingCards: [
      {
        side: "left",
        topPercent: 18,
        icon: <Users size={16} color="white" />,
        label: "Group Members",
        value: "24 Active",
      },
      {
        side: "right",
        topPercent: 48,
        icon: <Check size={16} color="white" strokeWidth={3} />,
        label: "Member Added",
        value: "Gauri Kapoor",
        badge: "Just joined",
      },
    ],
  },
  {
    id: "savings",
    label: "Savings Collection",
    headline: "Every rupee,",
    accent: "recorded instantly.",
    body: "No more tallying notebook columns. Tap once, savings recorded. The group total updates in real time.",
    Icon: PiggyBank,
    benefits: ["₹12,400 collected this month", "22 of 24 members paid", "Receipt generated instantly"],
    screenshot: imgPayments,
    floatingCards: [
      {
        side: "left",
        topPercent: 20,
        icon: <PiggyBank size={16} color="white" />,
        label: "Today's Collection",
        value: "₹52,300",
        badge: "12/12 paid",
      },
      {
        side: "right",
        topPercent: 52,
        icon: <Check size={16} color="white" strokeWidth={3} />,
        label: "Savings Recorded",
        value: "All paid",
      },
    ],
  },
  {
    id: "meetings",
    label: "Group Meetings",
    headline: "Meetings,",
    accent: "without paperwork.",
    body: "Attendance, agenda, minutes — recorded in a few taps. A permanent record any member can access anytime.",
    Icon: Calendar,
    benefits: ["22 of 24 present this meeting", "Minutes saved instantly", "All members notified by SMS"],
    floatingCards: [
      {
        side: "left",
        topPercent: 22,
        icon: <Calendar size={16} color="white" />,
        label: "Meeting Recorded",
        value: "15 May 2025",
      },
      {
        side: "right",
        topPercent: 50,
        icon: <Check size={16} color="white" strokeWidth={3} />,
        label: "Attendance",
        value: "22 / 24",
        badge: "Members present",
      },
    ],
  },
  {
    id: "loans",
    label: "Loan Management",
    headline: "Every loan,",
    accent: "always visible.",
    body: "Loan requests, approvals, EMI schedules, and outstanding balances — transparent to the whole group.",
    Icon: CreditCard,
    benefits: ["₹15,000 approved in minutes", "₹45,000 total outstanding", "3 active loans, zero disputes"],
    screenshot: imgLoans,
    floatingCards: [
      {
        side: "left",
        topPercent: 18,
        icon: <CreditCard size={16} color="white" />,
        label: "Active Loan",
        value: "₹1,00,000",
        badge: "Akshay Bhange",
      },
      {
        side: "right",
        topPercent: 50,
        icon: <TrendingUp size={16} color="white" />,
        label: "Outstanding",
        value: "₹1,00,000",
      },
    ],
  },
  {
    id: "ledger",
    label: "Group Ledger",
    headline: "Everything,",
    accent: "always balanced.",
    body: "Personal ledger and group ledger side by side. Automatic calculations. Bank-ready at any time.",
    Icon: BookOpen,
    benefits: ["₹1,24,600 current balance", "Auto-calculated, zero errors", "Bank-format export, one tap"],
    screenshot: imgLedger,
    floatingCards: [
      {
        side: "left",
        topPercent: 20,
        icon: <BookOpen size={16} color="white" />,
        label: "Closing Balance",
        value: "₹2,65,726",
        badge: "Auto-balanced",
      },
      {
        side: "right",
        topPercent: 52,
        icon: <Check size={16} color="white" strokeWidth={3} />,
        label: "Total Collected",
        value: "₹52,300",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    headline: "Know your group,",
    accent: "at a glance.",
    body: "Charts, insights, and monthly summaries generated automatically. Share with your bank in one tap.",
    Icon: BarChart3,
    benefits: ["5-month savings chart", "Group health: Excellent", "PDF report ready to share"],
    floatingCards: [
      {
        side: "left",
        topPercent: 20,
        icon: <BarChart3 size={16} color="white" />,
        label: "Reports Ready",
        value: "May 2025",
        badge: "Bank-format PDF",
      },
      {
        side: "right",
        topPercent: 52,
        icon: <Check size={16} color="white" strokeWidth={3} />,
        label: "Group Health",
        value: "Excellent",
      },
    ],
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

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Product", href: "#product" },
    { label: "Impact", href: "#impact" },
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
          <a href="#" className="flex items-center gap-3 shrink-0">
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
              <a key={l.href} href={l.href} className="hover:text-[#00a697] transition-colors">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-sm font-medium text-[#1e293b] px-3 py-2 rounded-full hover:bg-[#00a697]/10 transition-colors">
              <Globe size={15} className="text-[#00a697]" />
              English
            </button>
            <a href="#download" className="flex items-center gap-2 bg-white border border-[#94a3b8] rounded-full px-5 py-2 text-sm font-medium text-[#1e293b] hover:border-[#1e293b] hover:shadow-sm transition-all">
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
            <a key={l.href} href={l.href} className="text-base font-medium text-[#1e293b]" onClick={() => setMenuOpen(false)}>{l.label}</a>
          ))}
          <a href="#download" className="flex items-center gap-2 bg-white border border-[#94a3b8] rounded-full px-5 py-2.5 text-sm font-medium text-[#1e293b] w-fit" onClick={() => setMenuOpen(false)}>
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

function PhoneMockup({ w = 260, h = 535, screenshot, hideIsland = false, direction = 1 }: { w?: number; h?: number; screenshot?: string; hideIsland?: boolean; direction?: number }) {
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

        {/* Screen — slides in/out like a phone swipe */}
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#FFFFFF" }}>
          <AnimatePresence custom={direction} initial={false} mode="sync">
            <motion.div
              key={screenshot ?? "__blank__"}
              custom={direction}
              variants={screenSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
              style={{ willChange: "transform" }}
            >
              {screenshot
                ? <img src={screenshot} alt="" className="w-full h-full" style={{ display: "block", objectFit: "fill" }} />
                : <div className="w-full h-full" style={{ background: "#FFFFFF" }} />
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

function FloatingCard({
  icon,
  label,
  value,
  badge,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl px-3.5 py-3 border border-[#f1f5f9]"
      style={{
        boxShadow: "0 8px 32px rgba(12,12,13,0.10), 0 2px 8px rgba(12,12,13,0.06)",
        minWidth: 158,
        maxWidth: 190,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#00a697] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-[#94a3b8] leading-none mb-1 truncate">{label}</div>
          <div className="text-[14px] font-bold text-[#1e293b] leading-tight truncate">{value}</div>
          {badge && (
            <div className="mt-1.5 inline-flex items-center gap-1 bg-[#00a697] text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
              <TrendingUp size={8} />
              {badge}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Phone with Chapter Cards ─────────────────────────────────────────────────

function PhoneWithCards({
  chapter,
  w,
  h,
  showCards = true,
  direction = 1,
}: {
  chapter: Chapter | null;
  w: number;
  h: number;
  showCards?: boolean;
  direction?: number;
}) {
  const screenH = chapter?.screenshot ? Math.round((w - 6) * (2400 / 1080)) + 6 : h;

  return (
    <div className="relative flex items-center justify-center" style={{ width: w }}>
      <PhoneMockup w={w} h={screenH} screenshot={chapter?.screenshot} hideIsland={!!chapter?.screenshot} direction={direction} />

      {showCards && chapter && chapter.floatingCards.map((card, i) => {
        const isLeft = card.side === "left";
        return (
          <motion.div
            key={`${chapter.id}-${i}`}
            initial={{ opacity: 0, x: isLeft ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: isLeft ? -6 : 6, scale: 0.96 }}
            transition={{ duration: 0.42, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="absolute pointer-events-none"
            style={{
              top: `${card.topPercent}%`,
              ...(isLeft
                ? { right: "calc(100% + 14px)" }
                : { left: "calc(100% + 14px)" }),
            }}
          >
            <FloatingCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              badge={card.badge}
            />
          </motion.div>
        );
      })}
    </div>
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
        className="text-[40px] sm:text-[56px] font-medium text-[#1e293b] leading-tight tracking-tight max-w-2xl mx-auto mb-6"
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

          {/* Left card */}
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute"
            style={{ right: "calc(100% + 14px)", top: "20%" }}
          >
            <FloatingCard
              icon={<PiggyBank size={16} color="white" />}
              label="Group Savings"
              value="₹1,24,600"
              badge="+₹8,200 this month"
            />
          </motion.div>

          {/* Right card */}
          <motion.div
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="absolute hidden sm:block"
            style={{ left: "calc(100% + 14px)", top: "45%" }}
          >
            <FloatingCard
              icon={<Check size={16} color="white" strokeWidth={3} />}
              label="Savings Recorded"
              value="Sunita: +₹2,000"
            />
          </motion.div>
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
          <img src={imgPlayStore} alt="" className="w-5 object-contain" style={{ height: 22, filter: "brightness(10)" }} />
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

function ChapterContent({ chapter, isActive, stepNum }: { chapter: Chapter; isActive: boolean; stepNum: number }) {
  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0.22 }}
      transition={{ duration: 0.35 }}
      className="max-w-xs"
    >
      {/* Step line */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[11px] font-mono font-bold tracking-widest" style={{ color: isActive ? "#00a697" : "#cbd5e1" }}>
          {String(stepNum).padStart(2, "0")}
        </span>
        <div className="h-px flex-1" style={{ background: isActive ? "#00a697" : "#e2e8f0", transition: "background 0.4s" }} />
        <span className="text-[11px] font-mono text-[#cbd5e1]">{String(CHAPTERS.length).padStart(2, "0")}</span>
      </div>

      <p className="text-[11px] font-bold text-[#00a697] uppercase tracking-widest mb-2">{chapter.label}</p>

      <h2 className="text-4xl sm:text-5xl font-medium text-[#1e293b] leading-[1.1] tracking-tight mb-4">
        {chapter.headline}<br />
        <span className="font-extrabold text-[#00a697]">{chapter.accent}</span>
      </h2>

      <p className="text-[15px] text-[#64748b] leading-relaxed mb-8">{chapter.body}</p>

      <div className="space-y-3">
        {chapter.benefits.map((b, i) => (
          <motion.div
            key={b}
            animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -8 }}
            transition={{ duration: 0.3, delay: isActive ? i * 0.07 : 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-5 h-5 rounded-full bg-[#00a697] flex items-center justify-center shrink-0">
              <Check size={10} color="white" strokeWidth={3} />
            </div>
            <span className="text-sm font-medium text-[#475569]">{b}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function WalkthroughSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const activeIdxRef = useRef(0);
  const triggerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleEnter = useCallback((idx: number) => {
    setDirection(idx >= activeIdxRef.current ? 1 : -1);
    activeIdxRef.current = idx;
    setActiveIdx(idx);
  }, []);

  useEffect(() => {
    const observers = CHAPTERS.map((_, idx) => {
      const el = triggerRefs.current[idx];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) handleEnter(idx); },
        { threshold: 0.3, rootMargin: "-15% 0px -35% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [handleEnter]);

  const activeChapter = CHAPTERS[activeIdx];
  const stepLabel = `${String(activeIdx + 1).padStart(2, "0")} / ${String(CHAPTERS.length).padStart(2, "0")}`;

  return (
    <section id="product" className="relative" style={{ zIndex: 1 }}>
      <div className="text-center pt-16 pb-8 px-4">
        <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">Interactive Walkthrough</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#1e293b] tracking-tight">
          Scroll to experience the app.
        </h2>
        <p className="text-[#64748b] mt-3 text-sm">Six features. One continuous demo.</p>
      </div>

      {/* ── Desktop ──────────────────────────────────────────────── */}
      <div className="hidden md:block max-w-6xl mx-auto px-6">
        <div className="flex gap-12 lg:gap-20">

          {/* Left: sticky phone */}
          <div className="w-[55%] flex justify-center">
            <div className="sticky flex flex-col items-center gap-5" style={{ top: "10vh", height: "fit-content", paddingTop: 8 }}>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#94a3b8] tracking-widest">{stepLabel}</span>
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

              {/* Phone — screen slides like a swipe on chapter change */}
              <PhoneWithCards
                chapter={activeChapter}
                w={340}
                h={activeChapter?.screenshot ? Math.round((340 - 6) * (2400 / 1080)) + 6 : 700}
                showCards={true}
                direction={direction}
              />

              {/* Chapter label */}
              <motion.div
                key={`label-${activeIdx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-lg bg-[#00a697]/10 flex items-center justify-center">
                  {(() => { const { Icon } = CHAPTERS[activeIdx]; return <Icon size={13} className="text-[#00a697]" />; })()}
                </div>
                <span className="text-xs font-semibold text-[#94a3b8]">{CHAPTERS[activeIdx].label}</span>
              </motion.div>
            </div>
          </div>

          {/* Right: scrolling chapters */}
          <div className="flex-1">
            {CHAPTERS.map((ch, i) => (
              <div
                key={ch.id}
                ref={(el) => { triggerRefs.current[i] = el; }}
                className="flex items-center"
                style={{ minHeight: "88vh", paddingTop: 40, paddingBottom: 40 }}
              >
                <ChapterContent chapter={ch} isActive={activeIdx === i} stepNum={i + 1} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile ───────────────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Sticky phone header */}
        <div className="sticky top-14 z-20 bg-[#fffdf5]/95 backdrop-blur-md py-4 flex flex-col items-center gap-3 border-b border-[#f1f5f9]">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#94a3b8] tracking-widest">{stepLabel}</span>
            <div className="flex gap-1">
              {CHAPTERS.map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  animate={{ width: activeIdx === i ? 16 : 5, background: activeIdx === i ? "#00a697" : "#cbd5e1" }}
                  transition={{ duration: 0.35 }}
                  style={{ height: 5 }}
                />
              ))}
            </div>
          </div>
          {/* Phone — screen slides like a swipe on chapter change */}
          <PhoneMockup
            w={240}
            h={activeChapter?.screenshot ? Math.round((240 - 6) * (2400 / 1080)) + 6 : 490}
            screenshot={activeChapter?.screenshot}
            hideIsland={!!activeChapter?.screenshot}
            direction={direction}
          />
        </div>

        {/* Scrolling chapters */}
        <div className="px-6">
          {CHAPTERS.map((ch, i) => (
            <div
              key={ch.id}
              ref={(el) => { triggerRefs.current[i] = el; }}
              className="flex items-start flex-col gap-6"
              style={{ minHeight: "90vh", paddingTop: 48, paddingBottom: 40 }}
            >
              <ChapterContent chapter={ch} isActive={activeIdx === i} stepNum={i + 1} />

              {/* Show floating cards below content on mobile */}
              {activeIdx === i && (
                <div className="flex flex-col gap-2">
                  {ch.floatingCards.map((card, ci) => (
                    <FloatingCard
                      key={ci}
                      icon={card.icon}
                      label={card.label}
                      value={card.value}
                      badge={card.badge}
                      delay={ci * 0.1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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

function Footer() {
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
        <div className="flex gap-6 text-sm text-[#64748b] font-medium">
          <a href="#product" className="hover:text-[#00a697] transition-colors">Product</a>
          <a href="#impact" className="hover:text-[#00a697] transition-colors">Impact</a>
          <a href="#faq" className="hover:text-[#00a697] transition-colors">FAQ</a>
          <a href="#" className="hover:text-[#00a697] transition-colors">Privacy</a>
        </div>
        <div className="text-xs text-[#94a3b8]">© 2025 Ozey. Built for Indian SHGs.</div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif", background: "#fffdf5" }}>
      <Background />
      <Navbar />
      <main style={{ position: "relative", zIndex: 1 }}>
        <HeroSection />
        <ProblemSection />
        <WalkthroughSection />
        <ImpactSection />
        <RolesSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
