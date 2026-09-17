import { useEffect, useRef } from "react";
import { HeroOrbit } from "./HeroOrbit";
import { Reveal } from "./Reveal";
import { OzeyLogoMark } from "../components/site/brand";
import { GradientText } from "../components/primitives";

/**
 * Hero — atmosphere and identity only. ~100svh of strong silence:
 * logo, headline, one supporting line. The Living Orbit and Aurora
 * fade out smoothly as the hero scrolls away; the rest of the page
 * is a calm plain canvas.
 */
export function Hero() {
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = atmosphereRef.current;
    if (!el) return;
    const onScroll = () => {
      const fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.72));
      el.style.opacity = fade.toFixed(3);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="hero">
      <div ref={atmosphereRef} className="hero-atmosphere" aria-hidden>
        <div className="hero-aurora" />
        <HeroOrbit />
      </div>
      <div className="hero-content">
        <Reveal>
          <OzeyLogoMark />
        </Reveal>
        <Reveal as="h1" delay={140} className="type-display-hero hero-headline">
          Most businesses weren&rsquo;t built with software.
        </Reveal>
        <Reveal delay={300} className="hero-support">
          <p className="type-heading-md">
            <GradientText>They were built with trust.</GradientText>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
