import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import CoreTeamSection from "@/components/landing/CoreTeamSection";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Core Team`,
  description: "FinCognis core team: Decision Architects ve Strategic Operators.",
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
          <CoreTeamSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
