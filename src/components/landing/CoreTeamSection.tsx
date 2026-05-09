import React from "react";
import Link from "next/link";
import Image from "next/image";

interface TeamMember {
  name: string;
  role: string;
  affiliation: string;
  imageUrl: string;
  linkedinUrl?: string;
}

interface TeamSection {
  title: string;
  description: string;
  members: TeamMember[];
}

const TEAM_SECTIONS: TeamSection[] = [
  {
    title: "Decision Architects",
    description: "FinCognis'in karar sistemleri, ürün mimarisi ve finansal zeka altyapısını tasarlayan çekirdek ekip.",
    members: [
      {
        name: "Rubi Can İçliyürek",
        role: "Founder & Decision Systems Architect",
        affiliation: "Sabancı University",
        imageUrl: "/assets/team/rubi.png",
      },
      {
        name: "Adrian Vale",
        role: "Co Founder & Financial Intelligence Lead",
        affiliation: "Harvard Business School",
        imageUrl: "/assets/team/adrian.png",
      },
      {
        name: "Mina Arda",
        role: "Co Founder & Strategic Decision Frameworks",
        affiliation: "Stanford GSB",
        imageUrl: "/assets/team/mina.png",
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
        imageUrl: "/assets/team/sahincan.png",
        linkedinUrl: "https://www.linkedin.com/in/shahindzhan-yozbakar/?locale=tr",
      },
      {
        name: "Batuhan Yalçın",
        role: "SEO & GEO",
        affiliation: "LinkedIn",
        imageUrl: "/assets/team/batuhan.png",
        linkedinUrl: "https://www.linkedin.com/in/batuhan-yalcin58/",
      },
      {
        name: "Yiğit Ataman",
        role: "Community Management",
        affiliation: "LinkedIn",
        imageUrl: "/assets/team/yigit.png",
        linkedinUrl: "https://www.linkedin.com/in/yigitataman/",
      },
      {
        name: "Alara Dolunay",
        role: "Growth Marketing",
        affiliation: "LinkedIn",
        imageUrl: "/assets/team/alara.png",
        linkedinUrl: "https://www.linkedin.com/in/alaradolunay/",
      },
      {
        name: "Buse Mağden",
        role: "Dijital Processes",
        affiliation: "LinkedIn",
        imageUrl: "/assets/team/buse.png",
        linkedinUrl: "https://www.linkedin.com/in/busemagden/",
      },
      {
        name: "Victor Raye",
        role: "Attorney at Law",
        affiliation: "LinkedIn profili paylaşılmadı.",
        imageUrl: "/assets/team/victor.png",
      },
    ],
  },
];

function MemberName({ member }: { member: TeamMember }) {
  if (member.linkedinUrl) {
    return (
      <Link
        href={member.linkedinUrl}
        target="_blank"
        rel="noreferrer"
        className="font-display text-xl font-semibold tracking-[0.01em] text-slate-100 transition-colors hover:text-[#8ddfff] md:text-2xl"
      >
        {member.name}
      </Link>
    );
  }

  return <h3 className="font-display text-xl font-semibold tracking-[0.01em] text-slate-100 md:text-2xl">{member.name}</h3>;
}

function MemberAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex-shrink-0">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.95))] shadow-[0_4px_16px_rgba(0,0,0,0.4)] md:h-20 md:w-20">
        <Image
          src={src}
          alt={alt}
          width={80}
          height={80}
          className="h-full w-full object-cover"
          data-testid="member-avatar"
        />
      </div>
    </div>
  );
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
                  className="landing-card flex flex-col items-center gap-5 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.82))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/60 md:flex-row md:items-start md:justify-between"
                >
                  {/* Avatar — centered on mobile, right-aligned on md+ */}
                  <div className="md:hidden">
                    <MemberAvatar src={member.imageUrl} alt={member.name} />
                  </div>

                  {/* Text block */}
                  <div className="flex-1 text-center md:text-left">
                    <MemberName member={member} />
                    <p className="mt-2 text-sm font-semibold tracking-[0.02em] text-[#8ddfff]">{member.role}</p>
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="font-display text-xs tracking-[0.08em] text-slate-400">{member.affiliation}</p>
                    </div>
                  </div>

                  {/* Avatar — right side on md+ */}
                  <div className="hidden md:block">
                    <MemberAvatar src={member.imageUrl} alt={member.name} />
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
