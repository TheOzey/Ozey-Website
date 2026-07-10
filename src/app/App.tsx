import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import imgRectangle138 from "@/imports/Home/136acd2f9d0909776c4d8b9fa51cd10bf1b46c45.png";
import imgRectangle139 from "@/imports/Home/f17080a405b7aa37734d6ab8ec737252bef2ec38.png";
import { Header, type Page } from "./components/site/Header";
import { Footer } from "./components/site/Footer";
import { OzeyLogoMark } from "./components/site/brand";

// ─── Legacy inline aliases — now token-backed. Section composition migrates
//     fully onto primitives in Phase 2; no visual redesign in this phase. ────
const SF = "var(--font-sans)";
const GRADIENT = "var(--gradient-intelligence)";
const MUTED = "var(--text-muted)";
const FG = "var(--text-primary)";
const BLUE = "var(--text-secondary)";

// ─── Gradient text ────────────────────────────────────────────────────────────
function GText({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ backgroundImage: GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", ...style }}>
      {children}
    </span>
  );
}

// ─── Hero background effects ───────────────────────────────────────────────────
function HeroBg() {
  return (
    <>
      {/* Top radial glow — foreground at 8% opacity bleeding from the very top */}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(35% 80% at 49% 0%, rgba(255,255,255,0.08), transparent)" }} />

      {/* Outer container lines — visible on lg+, fade out at 80% height */}
      <div aria-hidden className="absolute inset-0 hidden lg:block pointer-events-none">
        <div className="relative mx-auto h-full" style={{ maxWidth: 1200 }}>
          <div className="absolute inset-y-0 left-0 w-px"
            style={{ background: "rgba(255,255,255,0.15)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }} />
          <div className="absolute inset-y-0 right-0 w-px"
            style={{ background: "rgba(255,255,255,0.15)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }} />
        </div>
      </div>

      {/* Inner content lines — contained within the 1200px layout column */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="relative mx-auto h-full" style={{ maxWidth: 1200 }}>
          <div className="absolute inset-y-0 left-4 md:left-8 w-px"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 100%)" }} />
          <div className="absolute inset-y-0 right-4 md:right-8 w-px"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 100%)" }} />
          <div className="absolute inset-y-0 left-8 md:left-12 w-px"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 100%)" }} />
          <div className="absolute inset-y-0 right-8 md:right-12 w-px"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 100%)" }} />
        </div>
      </div>
    </>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <HeroBg />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 text-center px-6">
        <OzeyLogoMark />
        <div className="flex flex-col items-center gap-4">
          <p style={{ fontFamily: SF, fontWeight: 600, fontSize: "clamp(24px,2.2vw,36px)", color: FG, letterSpacing: "-0.5px", lineHeight: 1.2, maxWidth: 720 }}>
            Most businesses weren't<br />built with software.
          </p>
          <GText style={{ fontFamily: SF, fontWeight: 400, fontSize: "clamp(14px,1vw,16px)", letterSpacing: "0px", lineHeight: 1.5 }}>
            They were built with trust.
          </GText>
        </div>
      </div>
    </section>
  );
}

// ─── Tools section ────────────────────────────────────────────────────────────
const TOOLS = ["Notebook.", "Calls.", "Memory.", "WhatsApp.", "Registers.", "Manual coordination."];

function ToolsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [activatedCount, setActivatedCount] = useState(0);

  useEffect(() => {
    const handler = () => {
      if (!ref.current) return;
      const { top, height } = ref.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -top / (height - window.innerHeight * 0.4)));
      setActivatedCount(Math.round(progress * TOOLS.length));
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <section ref={ref} className="relative w-full flex items-center" style={{ minHeight: 700 }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 md:px-0 py-20">
        <motion.div className="mb-10" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          <GText style={{ fontFamily: SF, fontWeight: 400, fontSize: 16, letterSpacing: "-0.01em" }}>
            The reality
          </GText>
        </motion.div>
        <div className="flex flex-col" style={{ gap: 14 }}>
          {TOOLS.map((word, i) => (
            <motion.p key={word}
              style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(28px,3.7vw,56px)", letterSpacing: "-1.68px", lineHeight: 1.1,
                color: i < activatedCount ? FG : MUTED, transition: "color 0.4s ease" }}
              initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.07 }}>
              {word}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Respect gap section ──────────────────────────────────────────────────────
function RespectGapSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  return (
    <section ref={ref} className="relative w-full flex items-center" style={{ minHeight: 700 }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 md:px-0 py-20">
        <motion.div
          className="w-full flex flex-col gap-3 px-10 md:px-14 py-14"
          style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, background: "rgba(255,255,255,0.01)" }}
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <p style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(22px,2.4vw,36px)", letterSpacing: "-1.08px", lineHeight: 1.15, color: MUTED }}>
            This isn't a technology gap.
          </p>
          <p style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(22px,2.4vw,36px)", letterSpacing: "-1.08px", lineHeight: 1.15, color: FG }}>
            It's a respect gap.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Infrastructure section ───────────────────────────────────────────────────
function InfrastructureSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  return (
    <section ref={ref} className="relative w-full flex items-center" style={{ minHeight: 700 }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 md:px-0 py-20">
        <motion.div className="mb-8" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          <GText style={{ fontFamily: SF, fontWeight: 400, fontSize: 16, letterSpacing: "-0.01em" }}>
            Infrastructure
          </GText>
        </motion.div>
        <motion.p
          style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(28px,3.7vw,56px)", letterSpacing: "-1.68px", lineHeight: 1.1, color: FG, maxWidth: 900 }}
          initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
          Ozey is building the operating system for micro & small businesses.
        </motion.p>
        <motion.p
          style={{ fontFamily: SF, fontWeight: 400, fontSize: "clamp(15px,1.5vw,22px)", letterSpacing: "-0.66px", lineHeight: 1.55, color: MUTED, marginTop: 24, maxWidth: 600 }}
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.35 }}>
          The invisible infrastructure underneath finally becomes visible.
          Not flashy. Just quietly organized.
        </motion.p>
      </div>
    </section>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({
  num, name, tagline, copy, image, delay = 0,
}: {
  num: string; name: string; tagline: string; copy: string[];
  image: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-8%" });
  const [hovered, setHovered] = useState(false);

  // Glossy gradient border: bright top-left (light source), dims toward bottom-right, subtle bottom sheen
  const glossBorder = hovered
    ? "linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.04) 58%, rgba(255,255,255,0.22) 100%)"
    : "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.02) 58%, rgba(255,255,255,0.1) 100%)";

  return (
    <motion.div
      ref={ref}
      className="relative cursor-pointer"
      style={{
        borderRadius: 35,
        padding: 1,
        background: glossBorder,
        boxShadow: hovered
          ? "0 40px 100px rgba(0,0,0,0.65), 0 0 0 0 transparent"
          : "0 24px 64px rgba(0,0,0,0.45)",
        transform: hovered ? "translateY(-6px)" : "translateY(0px)",
        transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), background 0.35s ease",
        height: 667,
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Inner card — sits inside the 1px glossy gradient wrapper */}
      <div className="flex flex-col overflow-hidden" style={{ borderRadius: 34, background: "rgba(22, 26, 32, 0.92)", height: "100%" }}>
        {/* Text zone */}
        <div style={{ padding: "46px 36px 28px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontFamily: SF, fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.35)", letterSpacing: "-0.01em" }}>
              {num}
            </span>
            <motion.div
              className="flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, background: FG, flexShrink: 0 }}
              animate={{ x: hovered ? 3 : 0, y: hovered ? -3 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 11L11 2M11 2H5M11 2V8" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </div>
          <h3 style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(24px,2.4vw,36px)", color: FG, letterSpacing: "-1.08px", lineHeight: 1.1, marginBottom: 6 }}>
            {name}
          </h3>
          <p style={{ fontFamily: SF, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.5)", letterSpacing: "-0.01em", marginBottom: 14 }}>
            {tagline}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {copy.map((line, i) => (
              <span key={i} style={{ fontFamily: SF, fontWeight: 400, fontSize: 14, color: "#cbd5e1", lineHeight: 1.6 }}>
                {line}
              </span>
            ))}
          </div>
        </div>
        {/* Product image */}
        <motion.div
          className="flex-1 overflow-hidden"
          animate={{ scale: hovered ? 1.02 : 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Products section ─────────────────────────────────────────────────────────
function ProductsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  return (
    <section ref={ref} className="relative w-full py-20" style={{ minHeight: 1070 }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 md:px-0">
        {/* Label + heading */}
        <motion.div className="mb-4" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          <GText style={{ fontFamily: SF, fontWeight: 400, fontSize: 16, letterSpacing: "-0.01em" }}>
            Products
          </GText>
        </motion.div>
        <motion.p
          style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(22px,2.4vw,36px)", color: FG, letterSpacing: "-1.08px", lineHeight: 1.1, marginBottom: 32 }}
          initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}>
          Upgrade your life. bit by bit.
        </motion.p>
        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
          <ProductCard
            num="01"
            name="Spendrova"
            tagline="Subscription Intelligence Platform"
            copy={[
              "Know every recurring payment.",
              "Never miss a renewal.",
              "Savings that happen automatically.",
            ]}
            image={imgRectangle138}
            delay={0.08}
          />
          <ProductCard
            num="02"
            name="Ozey SHG"
            tagline="Community Finance Platform"
            copy={[
              "Savings groups, organized.",
              "Member records. Meeting history.",
              "Loans tracked to the rupee.",
            ]}
            image={imgRectangle139}
            delay={0.2}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Gateway card ─────────────────────────────────────────────────────────────
function GatewayCard({ label, heading, desc, target, onNav }: {
  label: string; heading: string; desc: string; target: Page; onNav: (p: Page) => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      onClick={() => onNav(target)}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      className="relative overflow-hidden text-left w-full cursor-pointer flex flex-col"
      style={{
        padding: "100px 46px",
        border: `1px solid ${hov ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 30,
        background: hov ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "border-color 0.25s, background 0.25s",
        minHeight: 320,
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}>
      <p style={{ fontFamily: SF, fontWeight: 400, fontSize: 16, color: MUTED, marginBottom: 16, letterSpacing: "-0.01em" }}>
        {label}
      </p>
      <p style={{ fontFamily: SF, fontWeight: 590, fontSize: "clamp(24px,2.4vw,36px)", color: FG, letterSpacing: "-1.08px", lineHeight: 1.1, marginBottom: 8 }}>
        {heading}
      </p>
      <p style={{ fontFamily: SF, fontWeight: 400, fontSize: 16, color: MUTED, letterSpacing: "-0.01em", marginBottom: "auto", paddingBottom: 32 }}>
        {desc}
      </p>
      <motion.div
        className="flex items-center justify-center rounded-full"
        style={{ width: 36, height: 36, border: "1px solid rgba(255,255,255,0.2)", background: hov ? FG : "transparent", transition: "background 0.25s", marginTop: 24 }}
        animate={{ x: hov ? 3 : 0, y: hov ? -3 : 0 }}
        transition={{ duration: 0.25 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 12L12 2M12 2H5M12 2V9" stroke={hov ? "black" : "white"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </motion.button>
  );
}

// ─── Gateway section ──────────────────────────────────────────────────────────
function GatewaySection({ onNav }: { onNav: (p: Page) => void }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  return (
    <section ref={ref} className="relative w-full flex items-center" style={{ minHeight: 884 }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 md:px-0 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { label: "About", heading: "How Ozey thinks.", desc: "The origin, values, and direction of Ozey.", target: "about" as Page },
            { label: "Products", heading: "What Ozey builds.", desc: "The products inside the Ozey ecosystem.", target: "products" as Page },
          ]).map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}>
              <GatewayCard {...card} onNav={onNav} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── About page row (fixed: no hook-in-loop) ──────────────────────────────────
const ABOUT_ROWS = [
  { id: "01", title: "Origin", body: "Ozey began with a simple observation: millions of businesses run on relationships, memory, and trust — not software. The tools built for them were either too simple or too complex. Neither felt respectful." },
  { id: "02", title: "Connection", body: "Real business infrastructure isn't about features. It's about connection — between a business owner and their customers, between a decision made today and the context needed tomorrow." },
  { id: "03", title: "Structure", body: "We believe structure is a form of respect. When a business owner doesn't have to remember everything, they can focus on what matters. Ozey holds the structure so people don't have to." },
  { id: "04", title: "Direction", body: "Ozey moves in one direction: toward the simplest thing that actually works. We remove until we can't. Then we stop." },
  { id: "05", title: "Vision", body: "A world where every micro and small business has the same operational clarity as the largest enterprises — without the complexity." },
  { id: "06", title: "Mission", body: "Build the invisible infrastructure that powers the next million businesses." },
  { id: "07", title: "Principles", body: "Respect over complexity. Clarity over features. Infrastructure over interface. Every design decision flows from these three." },
];

function AboutRow({ r, i }: { r: typeof ABOUT_ROWS[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-8%" });
  return (
    <motion.div ref={ref} className="py-14" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: i * 0.04 }}>
      <div className="grid gap-8" style={{ gridTemplateColumns: "2.5rem 1fr 1fr" }}>
        <span className="font-mono text-xs pt-1" style={{ color: BLUE, opacity: 0.6 }}>{r.id}</span>
        <h3 style={{ fontFamily: SF, color: FG, fontSize: "clamp(17px,1.5vw,22px)", fontWeight: 500, letterSpacing: "-0.02em" }}>{r.title}</h3>
        <p style={{ fontFamily: SF, color: "rgba(255,255,255,0.38)", fontSize: "clamp(13px,1vw,15px)", lineHeight: 1.75, fontWeight: 300 }}>{r.body}</p>
      </div>
    </motion.div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen pt-28 px-10 md:px-24 lg:px-36 py-20"
      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px" }}>
      <div className="mb-28">
        <span className="block text-xs font-medium tracking-[0.2em] uppercase mb-8" style={{ fontFamily: SF, color: BLUE }}>About — Blueprint</span>
        <h1 style={{ fontFamily: SF, fontWeight: 600, fontSize: "clamp(52px,10vw,130px)", letterSpacing: "-0.045em", color: FG, lineHeight: 0.92 }}>
          How<br />Ozey<br />thinks.
        </h1>
      </div>
      <div>
        {ABOUT_ROWS.map((r, i) => <AboutRow key={r.id} r={r} i={i} />)}
      </div>
    </div>
  );
}

// ─── Products page card (fixed: no hook-in-loop) ──────────────────────────────
const PRODUCTS_LIST = [
  { id: "01", name: "Spendrova", tagline: "Subscription intelligence.", desc: "Know every recurring payment. Never miss a renewal. Savings that happen automatically.", status: "Active" },
  { id: "02", name: "Ozey SHG", tagline: "Community finance.", desc: "Savings groups, organized. Member records. Meeting history. Loans tracked to the rupee.", status: "Active" },
  { id: "03", name: "Ozey Book", tagline: "Memory for your business.", desc: "Notes, decisions, context — organized by relationship, not by date.", status: "Beta" },
  { id: "04", name: "Ozey Sell", tagline: "Sales, simplified.", desc: "Track customers, deals, and conversations in one clean ledger.", status: "Coming" },
  { id: "05", name: "Ozey Stock", tagline: "Inventory without overhead.", desc: "Stock levels, supplier records, and reorder triggers — quietly managed.", status: "Coming" },
];

function ProductPageCard({ p, i }: { p: typeof PRODUCTS_LIST[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-8%" });
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  const sc = p.status === "Active" ? "var(--text-secondary)" : p.status === "Beta" ? "var(--text-primary)" : "var(--text-muted)";
  return (
    <motion.div ref={ref} className="cursor-pointer"
      style={{ border: `1px solid ${hov ? "var(--border-strong)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", transition: "border-color 0.25s" }}
      initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: i * 0.08 }}
      onClick={() => setOpen(!open)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <span className="font-mono text-xs" style={{ color: BLUE, opacity: 0.6 }}>{p.id}</span>
          <span className="text-xs font-medium px-2 py-0.5"
            style={{ fontFamily: SF, color: sc, border: "1px solid var(--border-default)", borderRadius: "var(--radius-pill)", letterSpacing: "var(--tracking-label)" }}>
            {p.status}
          </span>
        </div>
        <h3 style={{ fontFamily: SF, color: FG, fontSize: "clamp(17px,1.4vw,21px)", fontWeight: 600, letterSpacing: "-0.025em", marginBottom: 6 }}>{p.name}</h3>
        <p style={{ fontFamily: SF, color: BLUE, fontSize: 14 }}>{p.tagline}</p>
        <AnimatePresence>
          {open && (
            <motion.p style={{ fontFamily: SF, color: "rgba(255,255,255,0.36)", fontWeight: 300, fontSize: 13, lineHeight: 1.7 }}
              initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: "1.25rem" }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.3 }}>
              {p.desc}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 mt-7">
          <span style={{ fontFamily: SF, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{open ? "Collapse" : "Expand"}</span>
          <motion.span animate={{ rotate: open ? 45 : 0 }}
            style={{ color: hov ? BLUE : "rgba(255,255,255,0.3)", transition: "color 0.2s", display: "inline-block", lineHeight: 1 }}>+</motion.span>
        </div>
      </div>
    </motion.div>
  );
}

function ProductsPage() {
  return (
    <div className="min-h-screen pt-28 px-10 md:px-24 lg:px-36 py-20">
      <div className="mb-24">
        <span className="block text-xs font-medium tracking-[0.2em] uppercase mb-8" style={{ fontFamily: SF, color: BLUE }}>Products — System</span>
        <h1 style={{ fontFamily: SF, fontWeight: 600, fontSize: "clamp(52px,10vw,130px)", letterSpacing: "-0.045em", color: FG, lineHeight: 0.92 }}>
          Five systems.<br />One ecosystem.
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRODUCTS_LIST.map((p, i) => <ProductPageCard key={p.id} p={p} i={i} />)}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <div style={{ background: "var(--surface-canvas)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <Header page={page} onNav={setPage} />
      <main id="main-content">
        <AnimatePresence mode="wait">
          {page === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <HeroSection />
              <ToolsSection />
              <RespectGapSection />
              <InfrastructureSection />
              <ProductsSection />
              <GatewaySection onNav={setPage} />
            </motion.div>
          )}
          {page === "about" && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <AboutPage />
            </motion.div>
          )}
          {page === "products" && (
            <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ProductsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
