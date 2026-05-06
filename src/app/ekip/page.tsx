import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import TeamSection from "@/components/landing/TeamSection";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Ekip`,
  description: "FinCognis kurucu ekibi ve karar sistemleri uzmanlık alanları.",
  path: "/ekip",
});

export default function TeamPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-24">
          <TeamSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
