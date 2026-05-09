import React from "react";
import Link from "next/link";

interface TeamMember {
  name: string;
  role: string;
  affiliation: string;
  link?: string;
}

interface TeamSection {
  title: string;
  description: string;
  members: TeamMember[];
}

const TEAM_SECTIONS: TeamSection[] = [
  {
    title: "Decision Architects",
    description: "FinCognis’in karar sistemleri, ürün mimarisi ve finansal zeka altyapısını tasarlayan çekirdek ekip.",
    members: [
      {
        name: "Rubi Can İçliyürek",
        role: "Founder & Decision Systems Architect",
        affiliation: "Sabancı University",
      },
      {
        name: "Adrian Vale",
        role: "Co Founder & Financial Intelligence Lead",
        affiliation: "Harvard Business School",
      },
      {
        name: "Mina Arda",
        role: "Co Founder & Strategic Decision Frameworks",
        affiliation: "Stanford GSB",
      },
    ],
  },
  {
    title: "Strategic Operators",
    description: "Büyüme, dağıtım, topluluk, AI operasyonları ve stratejik genişleme süreçlerini yöneten ekip.",
    members: [
      {
        name: "Şahincan Yozbakar",
        role: "AI Solutions",
        affiliation: "LinkedIn",
        link: "https://www.linkedin.com/in/shahindzhan-yozbakar/?locale=tr",
      },
      {
        name: "Batuhan Yalçın",
        role: "SEO & GEO",
        affiliation: "LinkedIn",
        link: "https://www.linkedin.com/in/batuhan-yalcin58/",
      },
      {
        name: "Yiğit Ataman",
        role: "Community Management",
        affiliation: "LinkedIn",
        link: "https://www.linkedin.com/in/yigitataman/",
      },
      {
        name: "Alara Dolunay",
        role: "Growth Marketing",
        affiliation: "LinkedIn",
        link: "https://www.linkedin.com/in/alaradolunay/",
      },
      {
        name: "Buse Mağden",
        role: "Dijital Processes",
        affiliation: "LinkedIn",
        link: "https://www.linkedin.com/in/busemagden/",
      },
      {
        name: "Victor Raye",
        role: "Attorney at Law",
        affiliation: "LinkedIn profili paylaşılmadı.",
      },
    ],
  },
];

function MemberName({ member }: { member: TeamMember }) {
  if (member.link) {
    return (
      <Link
        href={member.link}
        target="_blank"
        rel="noreferrer"
        className="font-display text-2xl font-semibold tracking-[0.01em] text-slate-100 transition-colors hover:text-[#8ddfff]"
      >
        {member.name}
      </Link>
    );
  }

  return <h3 className="font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">{member.name}</h3>;
}

export default function CoreTeamSection() {
  return (
    <section id="core-team" className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">CoreTeam</h2>
      </div>

      <div className="space-y-16">
        {TEAM_SECTIONS.map((section) => (
          <section key={section.title} aria-labelledby={section.title}>
            <div className="mb-8 text-center">
              <h3 id={section.title} className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-100 md:text-4xl">
                {section.title}
              </h3>
              <p className="mx-auto mt-4 max-w-3xl text-slate-300">{section.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {section.members.map((member) => (
                <article
                  key={member.name}
                  data-testid="core-team-member-card"
                  className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.82))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/60"
                >
                  <MemberName member={member} />
                  <p className="mt-3 text-sm font-semibold tracking-[0.02em] text-[#8ddfff]">{member.role}</p>
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="font-display text-xs tracking-[0.08em] text-slate-400">{member.affiliation}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
