import { Reveal } from "./Reveal";

/**
 * Infrastructure — clarity after tension. One statement, one quiet
 * supporting line, nothing else.
 */
export function Infrastructure() {
  return (
    <section className="section infra">
      <div className="container-page">
        <Reveal>
          <span className="type-label-md type-label-caps section-label">Infrastructure</span>
        </Reveal>
        <Reveal as="h2" delay={120} className="type-display-section infra-statement">
          Ozey is building the operating system for micro &amp; small businesses.
        </Reveal>
        <Reveal delay={260}>
          <p className="type-body-lg infra-support">
            The invisible infrastructure underneath finally becomes visible. Not
            flashy. Just quietly organized.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
