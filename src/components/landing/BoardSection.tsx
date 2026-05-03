import Link from "next/link";

interface BoardMember {
  name: string;
  role: string;
  linkedin?: string;
}

const BOARD_MEMBERS: BoardMember[] = [
  {
    name: "Alara Dolunay",
    role: "Growth Marketing",
    linkedin: "https://www.linkedin.com/in/alaradolunay/",
  },
  {
    name: "Batuhan Yalçın",
    role: "SEO & GEO",
    linkedin: "https://www.linkedin.com/in/batuhan-yalcin58/",
  },
  {
    name: "Şahincan Yozbakar",
    role: "AI Solutions",
    linkedin: "https://www.linkedin.com/in/shahindzhan-yozbakar/?locale=tr",
  },
  {
    name: "Olivers Mert Uz",
    role: "Architecting Sovereign Infrastructure & Deterministic Ecosystems",
    linkedin: "https://www.linkedin.com/in/olivers-mert-uz-2684a8187/",
  },
  {
    name: "Yiğit Ataman",
    role: "Community Management",
    linkedin: "https://www.linkedin.com/in/yigitataman/",
  },
  {
    name: "Buse Mağden",
    role: "Dijital Processes",
    linkedin: "https://www.linkedin.com/in/busemagden/",
  },
  {
    name: "Victor Raye",
    role: "Attorney at Law",
  },
];

export default function BoardSection() {
  return (
    <section id="yonetim-kurulu" className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Yönetim Kurulu</p>
        <h2 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          Stratejik Yönetişim Ekibi
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-slate-300">
          Büyüme, SEO, yapay zekâ, altyapı mimarisi, topluluk yönetimi ve hukuk odağında FinCognis stratejisini yöneten kurul.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {BOARD_MEMBERS.map((member) => (
          <article
            key={member.name}
            className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.82))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/60"
          >
            {member.linkedin ? (
              <Link
                href={member.linkedin}
                target="_blank"
                rel="noreferrer"
                className="font-display text-2xl font-semibold tracking-[0.01em] text-slate-100 transition-colors hover:text-[#8ddfff]"
              >
                {member.name}
              </Link>
            ) : (
              <h3 className="font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">{member.name}</h3>
            )}
            <p className="mt-3 text-sm font-semibold tracking-[0.02em] text-[#8ddfff]">{member.role}</p>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="font-display text-xs tracking-[0.08em] text-slate-400">
                {member.linkedin ? "LinkedIn profiline gitmek için isme tıklayın." : "LinkedIn profili paylaşılmadı."}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

