import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Target, Zap, Play } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 bg-white bg-grain">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-purple-200/40 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-cyan-100/30 rounded-full blur-[120px]"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50/50 backdrop-blur-sm rounded-full border border-indigo-100/50"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold tracking-wide text-indigo-700 uppercase">Intelligence by Google Gemini</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6 max-w-4xl"
          >
            <h1 className="text-6xl md:text-8xl font-black font-outfit tracking-tight leading-[0.9]">
              <span className="block text-premium-black">Elevate Your</span>
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent pb-2">
                Career Path
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
              The next generation of career development. Powered by Gemini AI to navigate your professional journey with precision and style.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 pt-4"
          >
            <Button
              size="lg"
              className="bg-premium-black hover:bg-black text-white text-lg px-10 py-7 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group border border-white/10"
              onClick={() => navigate('/signup')}
            >
              Start for Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7 rounded-2xl border-2 border-gray-100 hover:bg-gray-50 transition-all duration-300"
            >
              <Play className="w-5 h-5 mr-3 fill-indigo-600 text-indigo-600" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Minimalist Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-x-16 gap-y-8 pt-12"
          >
            {[
              { label: "Active Users", value: "25k+" },
              { label: "AI Insights", value: "1.2M" },
              { label: "Success Rate", value: "98%" }
            ].map((stat, i) => (
              <div key={i} className="text-left">
                <div className="text-4xl font-black font-outfit text-premium-black mb-1">{stat.value}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatingIcon({ icon: Icon, color, delay, ...position }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <motion.div
      animate={{
        y: [0, -15, 0],
        rotate: [0, 5, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay
      }}
      className="absolute"
      style={position}
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl shadow-lg flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </motion.div>
  );
}