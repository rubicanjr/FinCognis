interface TeamMember {
  name: string;
  role: string;
  institution: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Rubi Can İçliyürek",
    role: "Founder & Decision Systems Architect",
    institution: "Sabancı University",
  },
  {
    name: "Adrian Vale",
    role: "Co Founder & Financial Intelligence Lead",
    institution: "Harvard Business School",
  },
  {
    name: "Mina Arda",
    role: "Co Founder & Strategic Decision Frameworks",
    institution: "Stanford GSB",
  },
];

export default function TeamSection() {
  return (
    <section id="ekip" className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Ekip</p>
        <h2 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          FinCognis Kurucu Ekibi
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">
          Karar sistemleri, finansal zekâ ve stratejik çerçeve tasarımı odaklı multidisipliner ekip.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TEAM_MEMBERS.map((member) => (
          <article
            key={member.name}
            className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.82))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/60"
          >
            <h3 className="font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">{member.name}</h3>
            <p className="mt-3 text-sm font-semibold tracking-[0.02em] text-[#8ddfff]">{member.role}</p>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="font-display text-sm tracking-[0.03em] text-slate-300">{member.institution}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
