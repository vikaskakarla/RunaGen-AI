import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Cloud, Database, Search, Zap, Shield, Layers } from "lucide-react";

export default function TechStackGrid() {
  const techStack = [
    {
      name: "Gemini 2.5 Flash",
      description: "Smart content generation with state-of-the-art language models",
      icon: Sparkles,
      gradient: "from-purple-600 to-pink-600",
      size: "large"
    },
    {
      name: "Vertex AI",
      description: "Scalable ML backbone for training and deployment",
      icon: Zap,
      gradient: "from-orange-500 to-red-500",
      size: "medium"
    },
    {
      name: "RAG + Vector Search",
      description: "Context-aware retrieval for intelligent responses",
      icon: Search,
      gradient: "from-blue-500 to-cyan-500",
      size: "medium"
    },
    {
      name: "MongoDB + Google Cloud",
      description: "Secure, scalable data persistence",
      icon: Database,
      gradient: "from-green-500 to-emerald-500",
      size: "large"
    },
    {
      name: "Cloud Infrastructure",
      description: "Enterprise-grade reliability",
      icon: Cloud,
      gradient: "from-indigo-500 to-purple-500",
      size: "small"
    },
    {
      name: "Security First",
      description: "Your data, protected",
      icon: Shield,
      gradient: "from-slate-600 to-slate-700",
      size: "small"
    }
  ];

  const gridStyles = {
    large: "md:col-span-2 md:row-span-2",
    medium: "md:col-span-2 md:row-span-1",
    small: "md:col-span-1 md:row-span-1"
  };

  return (
    <section id="tech" className="py-32 px-6 bg-premium-black relative overflow-hidden">
      {/* Immersive Dark Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <span className="text-sm font-black tracking-[0.3em] text-cyan-400 uppercase mb-4 block">Our Infrastructure</span>
          <h2 className="text-5xl md:text-7xl font-black font-outfit text-white mb-6 tracking-tight">
            Built for <span className="premium-gradient">Scale & Speed</span>
          </h2>
          <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Leveraging the most advanced AI infrastructure in the world to power your career transformation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {techStack.map((tech, index) => {
            const Icon = tech.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`${gridStyles[tech.size]} group glass-dark rounded-[2.5rem] p-10 hover:border-white/20 transition-all duration-500 flex flex-col`}
              >
                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-white transition-colors duration-500 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}>
                    <Icon className="w-8 h-8 text-white group-hover:text-premium-black transition-colors duration-500" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-black font-outfit text-white mb-4 tracking-tight">
                    {tech.name}
                  </h3>
                  <p className="text-lg text-gray-400 font-medium leading-relaxed mb-8">
                    {tech.description}
                  </p>

                  {/* Status Indicator */}
                  <div className="mt-auto flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">System Online</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}