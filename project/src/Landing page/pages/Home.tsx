import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";


import HeroSection from "../components/landing/HeroSection";
import BentoCapabilities from "../components/landing/BentoCapabilities";
import FeatureShowcase from "../components/landing/FeatureShowcase";
import TechStackGrid from "../components/landing/TechStackGrid";
import DemoCTA from "../components/landing/DemoCTA";
import TestimonialsBento from "../components/landing/TestimonialsBento";
import Footer from "../components/landing/Footer";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Navigation */}
      <motion.nav
        className="fixed top-0 w-full z-50 transition-all duration-500"
        style={{
          background: scrollY > 50 ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(0,0,0,0.05)' : 'none',
          paddingTop: scrollY > 50 ? '12px' : '24px',
          paddingBottom: scrollY > 50 ? '12px' : '24px',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative w-10 h-10 flex items-center justify-center bg-premium-black rounded-xl overflow-hidden group-hover:rotate-12 transition-transform duration-300">
              <img
                src="/runagen-logo.svg"
                alt="Runa"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black font-outfit tracking-tighter text-premium-black">RUNA GEN</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-600 uppercase">Intelligence</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {['Features', 'Technology', 'Solutions'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-bold text-gray-500 hover:text-premium-black transition-colors uppercase tracking-widest"
              >
                {item}
              </a>
            ))}
            <div className="h-4 w-[1px] bg-gray-200 mx-2" />
            <Button variant="ghost" className="text-sm font-bold text-gray-600 hover:text-premium-black" onClick={() => navigate('/login')}>Login</Button>
            <Button
              onClick={() => navigate('/signup')}
              className="bg-premium-black hover:bg-black text-white px-6 py-5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-indigo-200"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.nav>

      <HeroSection />
      <BentoCapabilities />
      <FeatureShowcase />
      <TechStackGrid />
      <DemoCTA />
      <TestimonialsBento />
      <Footer />
    </div>
  );
}