import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import TerminalDemo from "@/components/landing/TerminalDemo";
import Solutions from "@/components/landing/Solutions";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import Comparison from "@/components/landing/Comparison";
import FAQ from "@/components/landing/FAQ";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-['Inter']">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <TerminalDemo />
      <Solutions />
      <HowItWorks />
      <Pricing />
      <Comparison />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default LandingPage;
