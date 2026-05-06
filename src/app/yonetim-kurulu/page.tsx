import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BoardSection from "@/components/landing/BoardSection";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Yönetim Kurulu`,
  description: "FinCognis yönetim kurulu üyeleri ve uzmanlık alanları.",
  path: "/yonetim-kurulu",
});

export default function BoardPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-24">
          <BoardSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}

