import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AnalyticsBento from "@/components/landing/AnalyticsBento";
import SecureTransactions from "@/components/landing/SecureTransactions";
import GlobalCompliance from "@/components/landing/GlobalCompliance";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <AnalyticsBento />
      <SecureTransactions />
      <GlobalCompliance />
      <Footer />
    </>
  );
}
