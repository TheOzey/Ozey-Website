import { OzeyWordmark } from "./brand";
import { IconLink, VisuallyHidden } from "../primitives";
import { InstagramIcon, LinkedInIcon, XIcon } from "../icons";

const SOCIAL_LINKS = [
  {
    label: "Ozey on LinkedIn",
    href: "https://www.linkedin.com/company/ozey",
    Icon: LinkedInIcon,
  },
  {
    label: "Ozey on X",
    href: "https://x.com/ozeyindia",
    Icon: XIcon,
  },
  {
    label: "Ozey on Instagram",
    href: "https://www.instagram.com/ozeyindia",
    Icon: InstagramIcon,
  },
];

/* Footer: compact and restrained — no gradient, no ambient animation.
   The logo is enough. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-page">
        <div className="site-footer-row">
          <span className="site-footer-brand">
            <OzeyWordmark height={20} />
            <VisuallyHidden>Ozey</VisuallyHidden>
          </span>
          <a className="site-footer-email" href="mailto:hello@ozey.in">
            hello@ozey.in
          </a>
          <div className="site-footer-social">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <IconLink
                key={label}
                label={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon size="cardAction" />
              </IconLink>
            ))}
          </div>
        </div>
        <div className="site-footer-meta">
          <span>Built in India.</span>
          <span>© 2026 Ozey</span>
        </div>
      </div>
    </footer>
  );
}
