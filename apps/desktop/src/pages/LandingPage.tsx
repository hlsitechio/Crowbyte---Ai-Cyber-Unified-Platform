import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import Solutions from "@/components/landing/Solutions";
import HowItWorks from "@/components/landing/HowItWorks";
import Downloads from "@/components/landing/Downloads";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-x-hidden font-['JetBrains_Mono'] relative">
      {/* Global grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <Solutions />
      <HowItWorks />
      <Downloads />
      <Pricing />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default LandingPage;
