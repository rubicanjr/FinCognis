import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ContactSection from "@/components/landing/ContactSection";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | İletişim`,
  description: "FinCognis iletişim kanalları ve iş birliği başvuru noktaları.",
  path: "/iletisim",
});

export default function ContactPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-24">
          <ContactSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}

