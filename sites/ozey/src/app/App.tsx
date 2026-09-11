import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { Header, type Page } from "./components/site/Header";
import { Footer } from "./components/site/Footer";
import { Hero } from "./sections/Hero";
import { CurrentReality } from "./sections/CurrentReality";
import { RespectGap } from "./sections/RespectGap";
import { Infrastructure } from "./sections/Infrastructure";
import { ProductsShowcase } from "./sections/ProductsShowcase";
import { Gateways } from "./sections/Gateways";

// ─── Legacy inline aliases (About/Products pages only — those pages are
//     redesigned in a later phase; do not extend these to new code) ──────────
const SF = "var(--font-sans)";
const FG = "var(--text-primary)";
const BLUE = "var(--text-secondary)";

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
    <motion.div ref={ref} className="py-14" style={{ borderTop: "1px solid var(--border-subtle)" }}
      initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: i * 0.04 }}>
      <div className="grid gap-8" style={{ gridTemplateColumns: "2.5rem 1fr 1fr" }}>
        <span className="font-mono text-xs pt-1" style={{ color: BLUE, opacity: 0.6 }}>{r.id}</span>
        <h3 style={{ fontFamily: SF, color: FG, fontSize: "clamp(17px,1.5vw,22px)", fontWeight: 500, letterSpacing: "-0.02em" }}>{r.title}</h3>
        <p style={{ fontFamily: SF, color: "var(--text-tertiary)", fontSize: "clamp(13px,1vw,15px)", lineHeight: 1.75, fontWeight: 300 }}>{r.body}</p>
      </div>
    </motion.div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen pt-28 px-10 md:px-24 lg:px-36 py-20"
      style={{ backgroundImage: "linear-gradient(var(--grid-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--grid-subtle) 1px, transparent 1px)", backgroundSize: "60px 60px" }}>
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
            <motion.p style={{ fontFamily: SF, color: "var(--text-tertiary)", fontWeight: 300, fontSize: 13, lineHeight: 1.7 }}
              initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: "1.25rem" }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.3 }}>
              {p.desc}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 mt-7">
          <span style={{ fontFamily: SF, fontSize: 12, color: "var(--text-muted)" }}>{open ? "Collapse" : "Expand"}</span>
          <motion.span animate={{ rotate: open ? 45 : 0 }}
            style={{ color: hov ? BLUE : "var(--text-muted)", transition: "color 0.2s", display: "inline-block", lineHeight: 1 }}>+</motion.span>
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
              <Hero />
              <CurrentReality />
              <RespectGap />
              <Infrastructure />
              <ProductsShowcase onNav={setPage} />
              <Gateways onNav={setPage} />
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
