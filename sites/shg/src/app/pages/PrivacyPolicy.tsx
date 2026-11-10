import { useEffect, useState } from "react";

/**
 * Public Privacy Policy.
 *
 * Every statement here is grounded in the Ozey SHG application source. Nothing
 * on this page describes behaviour that has not shipped, and nothing describes
 * internal process. Items still awaiting a business or legal answer are tracked
 * outside this file and must not appear in rendered content.
 */

export const LAST_UPDATED = "16 September 2026";

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] sm:text-base leading-[1.75] text-[#475569] mb-4">{children}</p>;
}

/** Bold inline label for a defined concept. */
function T({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-[#1e293b]">{children}</strong>;
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mb-5 flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] sm:text-base leading-[1.7] text-[#475569]">
          <span aria-hidden className="mt-[0.62em] h-1 w-1 shrink-0 rounded-full bg-[#00a697]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-7 mb-2.5 text-[13px] font-bold uppercase tracking-[0.07em] text-[#1e293b]">
      {children}
    </h3>
  );
}

interface Section {
  id: string;
  title: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: (
      <>
        <P>
          Ozey SHG is a mobile application for Self Help Groups in India. It helps a group keep its
          own records — members, monthly savings, loans, meetings and the group ledger — in one
          place, so the work that used to live in paper registers stays organised and available to
          the group.
        </P>
        <P>
          A Self Help Group's records are financial records about real people, often neighbours. We
          treat them as belonging to the group rather than to us.
        </P>
        <P>This policy covers the Ozey SHG mobile app and this website.</P>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    body: (
      <>
        <SubHead>Your account</SubHead>
        <P>
          You sign in with your phone number. We send a one-time code by SMS to verify it. We keep
          your phone number, your name, the role you chose, the group you belong to, the app version
          you are running, and the time you last signed in.
        </P>

        <SubHead>Your group</SubHead>
        <P>
          The group's name, its invite code, the roles within it, and the settings that describe how
          it operates.
        </P>

        <SubHead>The people in your group</SubHead>
        <P>
          When adding a member to an SHG, the app currently asks for the member's{" "}
          <T>name</T> and <T>10-digit phone number</T>. The app does not currently provide a form
          for collecting identity documents, addresses, or similar information.
        </P>

        <SubHead>Your group's records</SubHead>
        <P>
          Monthly savings and who has paid, loans made from the group's fund and their repayments,
          meeting dates and attendance, and the group ledger with its opening balances and monthly
          closing figures.
        </P>

        <SubHead>App usage and technical information</SubHead>
        <P>
          We use <T>Firebase Analytics</T> and <T>Firebase Crashlytics</T> to understand how the app
          is used and to identify and diagnose technical problems. These services may receive
          information such as your Firebase account identifier, app version, device information,
          language, events and crash information.
        </P>
        <P>
          Because the account identifier can be associated with your account,{" "}
          <T>this information is not anonymous</T>.
        </P>

        <SubHead>Permissions the app uses</SubHead>
        <P>
          Ozey SHG uses internet access, notifications, vibration, and — on older versions of
          Android — file access so you can save and open backup files. The app{" "}
          <T>does not request</T> access to your contacts, your location, your camera, or your
          messages.
        </P>

        <SubHead>When you contact us</SubHead>
        <P>
          Whatever you choose to send — your message, your contact details, and any screenshots you
          include.
        </P>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    body: (
      <>
        <P>We use the information described above to:</P>
        <List
          items={[
            "Provide and operate Ozey SHG.",
            "Keep your group's records available when you return to them.",
            "Run the savings, loans, meetings, ledger and reporting features.",
            "Sync your group's records so they survive a lost or replaced phone.",
            "Identify and fix technical problems, and improve reliability.",
            "Respond to your support requests.",
            "Keep the service secure and prevent misuse.",
          ]}
        />
        <P>
          We do not use your group's savings, loan or member records for advertising, and we do not
          sell them.
        </P>
      </>
    ),
  },
  {
    id: "how-your-shg-data-works",
    title: "How Your SHG Data Works",
    body: (
      <>
        <P>
          A Self Help Group's records are shared records. When the President or Secretary records a
          member's savings payment, adds a member, or issues a loan, they are entering information{" "}
          <T>about another person</T>. The app works this way on purpose — it reflects how SHGs
          operate, where one or two office-bearers keep the register on behalf of everyone.
        </P>
        <P>If you manage records for your group, please:</P>
        <List
          items={[
            "Enter information only about people the group has authorised you to manage.",
            "Enter only what the group's record-keeping needs.",
            "Tell your members that their savings, loan and attendance records are kept in the app.",
          ]}
        />
        <P>
          Who can see what is enforced by the server, not only by the app. Every read and write is
          checked against the account you signed in with. Only members the group's admin has
          approved can see the group's records, and only the admin can approve, remove, or change
          another member's entry.
        </P>
      </>
    ),
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    body: (
      <>
        <P>
          We do not sell or rent your personal information, and we do not sell or rent your group's
          records. Information is shared in three specific ways.
        </P>

        <SubHead>Service providers</SubHead>
        <P>
          Ozey SHG runs on Google's Firebase platform. Google processes information on our behalf
          for sign-in and the SMS code, storage and syncing of your group's records, app usage and
          crash reporting, and the checks that confirm requests come from the genuine app.
        </P>

        <SubHead>Members of your group</SubHead>
        <P>
          Ozey SHG exists to keep a shared register, so group information is visible to the members
          of that group according to their role. Savings, loans, meetings and the ledger are group
          records, and approved members can see them.
        </P>

        <SubHead>Files you export</SubHead>
        <P>
          When you export your group's data or a report, the app hands the file to your phone's
          share menu and you choose where it goes. That sharing is yours — it happens because you
          chose it, and the destination is your choice.
        </P>
      </>
    ),
  },
  {
    id: "data-storage-and-security",
    title: "Data Storage & Security",
    body: (
      <>
        <SubHead>On your phone</SubHead>
        <P>
          Ozey SHG protects locally stored application data using <T>AES-256 encryption</T>, with
          the encryption key protected by the device's platform keychain — the Android Keystore or
          the iOS Keychain.
        </P>

        <SubHead>In the cloud</SubHead>
        <P>
          Your group's records sync to Google Cloud Firestore so they survive a lost or replaced
          phone. Access to cloud-hosted data is controlled through Firebase security mechanisms,
          checked against your signed-in account, and requests are verified as coming from the
          genuine app.
        </P>

        <SubHead>Files you export are not protected</SubHead>
        <P>
          A backup or report you export is a plain <T>JSON or CSV file that is not encrypted</T>.
          Anyone who can open it can read the names, phone numbers, savings amounts and loans it
          contains. Once you send it somewhere — a chat, an email, a cloud drive — it is governed by
          that service.
        </P>
        <P>
          Send exported files only to people who should see the group's finances, and prefer a
          destination you control.
        </P>
      </>
    ),
  },
  {
    id: "data-retention-and-deletion",
    title: "Data Retention & Deletion",
    body: (
      <>
        <P>
          A group's records are meant to last — a savings ledger is only useful if it still shows
          what happened three years ago. We keep them for as long as the group is using Ozey SHG.
        </P>

        <SubHead>Deleting your account</SubHead>
        <P>
          You can request deletion of your Ozey SHG account from within the app. When you use the
          account deletion option, <T>your account is marked as deleted and you are signed out</T>.
        </P>
        <P>
          Because SHG financial records are shared group records, deleting an individual account
          does not automatically erase historical group records such as savings, loans, repayments,
          meetings or ledger entries associated with the group.
        </P>
        <P>
          This is deliberate. An SHG's ledger belongs to the whole group, and one member should not
          be able to remove everyone else's financial history.
        </P>

        <SubHead>If you leave a group</SubHead>
        <P>
          You lose access to the group's records. Your past savings and loan repayments stay in the
          group's ledger, because removing them would leave the group's accounts unable to balance.
        </P>

        <SubHead>Requests about your information</SubHead>
        <P>
          Write to us at the address below with any request about your information and we will
          respond.
        </P>
      </>
    ),
  },
  {
    id: "your-choices-and-rights",
    title: "Your Choices & Rights",
    body: (
      <>
        <P>Using Ozey SHG, you can:</P>
        <List
          items={[
            "View your SHG records within the app — members, savings, loans, meetings and the ledger.",
            "Correct inaccurate information by editing the group's records.",
            "Export available group records and keep your own copy.",
            "Request deletion of your account, as described above.",
            "Stop using Ozey SHG at any time. It is free, and there is nothing to cancel.",
            "Contact Ozey about privacy questions or requests.",
          ]}
        />
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    body: (
      <>
        <P>
          Ozey SHG is intended for adults managing a Self Help Group's finances. The service is not
          directed at children, and we do not knowingly collect information from a child.
        </P>
        <P>
          If you believe information relating to a child has been provided to Ozey SHG, please
          contact us and we will look into it.
        </P>
      </>
    ),
  },
  {
    id: "changes-to-this-privacy-policy",
    title: "Changes to This Privacy Policy",
    body: (
      <P>
        We may update this policy as Ozey SHG changes. When we do, we will revise the &ldquo;Last
        updated&rdquo; date at the top of this page, so you can tell at a glance whether anything
        has changed since you last read it.
      </P>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Us",
    body: (
      <>
        <P>
          If you have a question about this policy, about your group's records, or about a request
          concerning your information, write to us:
        </P>
        <p className="mb-2">
          <a
            href="mailto:hello@ozey.in"
            className="text-base font-semibold text-[#00a697] hover:underline"
          >
            hello@ozey.in
          </a>
        </p>
      </>
    ),
  },
];

const num = (i: number) => String(i + 1).padStart(2, "0");

/** Sticky contents rail — large screens only, so it never covers the policy. */
function Contents({ activeId }: { activeId: string }) {
  return (
    <nav aria-label="Contents" className="hidden xl:block">
      <div className="sticky" style={{ top: 112 }}>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Contents
        </p>
        <ol className="flex flex-col gap-2.5">
          {SECTIONS.map((s, i) => {
            const on = s.id === activeId;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex gap-2.5 text-[13px] leading-snug transition-colors"
                  style={{ color: on ? "#00a697" : "#94a3b8" }}
                >
                  <span className="font-mono text-[11px] pt-px">{num(i)}</span>
                  <span className={on ? "font-semibold" : ""}>{s.title}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export default function PrivacyPolicyPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  // Title and canonical both describe the page, so they move together. A
  // canonical left pointing at the homepage would tell search engines this
  // page is a duplicate of "/", undoing its own entry in the sitemap.
  useEffect(() => {
    const url = "https://shg.ozey.in/privacy-policy";
    const title = "Privacy Policy — Ozey SHG";

    const canonical = document.head.querySelector('link[rel="canonical"]');
    const ogUrl = document.head.querySelector('meta[property="og:url"]');

    const prev = {
      title: document.title,
      canonical: canonical?.getAttribute("href") ?? null,
      ogUrl: ogUrl?.getAttribute("content") ?? null,
    };

    document.title = title;
    canonical?.setAttribute("href", url);
    ogUrl?.setAttribute("content", url);

    return () => {
      document.title = prev.title;
      if (prev.canonical !== null) canonical?.setAttribute("href", prev.canonical);
      if (prev.ogUrl !== null) ogUrl?.setAttribute("content", prev.ogUrl);
    };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="px-5 sm:px-6" style={{ paddingTop: 112 }}>
      <div className="mx-auto" style={{ maxWidth: 1000 }}>
        {/* Hero */}
        <header style={{ maxWidth: 720 }}>
          <h1
            className="font-medium tracking-tight text-[#1e293b]"
            style={{ fontSize: "clamp(32px, 7vw, 48px)", lineHeight: 1.08 }}
          >
            Privacy Policy
          </h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-relaxed text-[#64748b]">
            Your privacy matters. This policy explains what information Ozey SHG collects, how we
            use it, where it is stored, and the choices available to you.
          </p>
          <p className="mt-6 text-[13px] font-medium text-[#94a3b8]">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <hr className="my-10 sm:my-14 border-0 border-t" style={{ borderColor: "#e7e5e4" }} />

        <div className="grid gap-x-12 xl:grid-cols-[220px_minmax(0,1fr)]">
          <Contents activeId={activeId} />

          <div style={{ maxWidth: 720 }}>
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                style={{ scrollMarginTop: 96 }}
                className="mb-14 sm:mb-16"
              >
                <div className="mb-5 flex items-baseline gap-3 sm:gap-4">
                  <span className="font-mono text-[13px] font-bold text-[#00a697]">{num(i)}</span>
                  <h2
                    className="font-semibold tracking-tight text-[#1e293b]"
                    style={{ fontSize: "clamp(21px, 4.5vw, 27px)", lineHeight: 1.2 }}
                  >
                    {s.title}
                  </h2>
                </div>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
