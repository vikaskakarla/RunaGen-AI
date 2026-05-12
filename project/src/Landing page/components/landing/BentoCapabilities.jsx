import React from "react";
import { motion } from "framer-motion";
import { FileText, TrendingUp, Brain, Target, ArrowRight } from "lucide-react";

export default function BentoCapabilities() {
  const capabilities = [
    {
      title: "AI-Powered Resume Analysis",
      description: "Smart parsing with skill extraction and job match scoring",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      visual: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-600">Parsing complete</span>
          </div>
          <div className="space-y-1">
            {['Python', 'React', 'Cloud Architecture'].map((skill, i) => (
              <motion.div
                key={skill}
                initial={{ width: 0 }}
                whileInView={{ width: `${90 - i * 15}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              />
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Personalized Learning Paths",
      description: "AI-driven roadmaps with skill priorities from Critical to Nice-to-have",
      icon: TrendingUp,
      gradient: "from-purple-500 to-pink-500",
      visual: (
        <div className="space-y-3">
          {[
            { label: 'Critical Skills', width: '100%', color: 'bg-purple-500' },
            { label: 'Important', width: '70%', color: 'bg-purple-400' },
            { label: 'Nice-to-have', width: '40%', color: 'bg-purple-300' }
          ].map((item, i) => (
            <div key={i}>
              <div className="text-xs text-gray-600 mb-1">{item.label}</div>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: item.width }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className={`h-2 ${item.color} rounded-full`}
              />
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Career Mentor (Gemini AI)",
      description: "Conversational AI with context-aware feedback and guidance",
      icon: Brain,
      gradient: "from-indigo-500 to-purple-500",
      visual: (
        <div className="space-y-2">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 text-sm text-gray-700">
            How can I transition to cloud engineering?
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            Based on your background, I recommend...
            <motion.div
              className="mt-1 flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </motion.div>
          </div>
        </div>
      )
    },
    {
      title: "Career Simulations",
      description: "Practice real-world scenarios with instant AI feedback",
      icon: Target,
      gradient: "from-orange-500 to-red-500",
      visual: (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Completed', value: '12' },
            { label: 'Success Rate', value: '89%' },
            { label: 'Avg Score', value: '85' },
            { label: 'Badges', value: '5' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3 text-center"
            >
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      )
    }
  ];

  return (
    <section id="features" className="py-32 px-6 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <span className="text-sm font-black tracking-[0.3em] text-indigo-600 uppercase mb-4 block">Core Capabilities</span>
          <h2 className="text-5xl md:text-7xl font-black font-outfit text-premium-black mb-6 tracking-tight">
            Designed for <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Peak Performance</span>
          </h2>
          <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Every tool is engineered to deliver precise, actionable insights for your professional growth.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            // First 2 cards take 3 columns each, next 2 take 3 columns each or similar
            const colSpan = index < 2 ? "lg:col-span-3" : "lg:col-span-3";

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`${colSpan} group relative bg-gray-50/50 rounded-[2.5rem] p-10 hover:shadow-3xl transition-all duration-500 border border-gray-100/50 overflow-hidden`}
              >
                {/* Large Background Icon */}
                <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                  <Icon className="w-64 h-64 text-premium-black" />
                </div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-white shadow-xl rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-300 border border-gray-50`}>
                    <Icon className="w-8 h-8 text-indigo-600" />
                  </div>

                  {/* Content */}
                  <h3 className="text-3xl font-black font-outfit text-premium-black mb-4 tracking-tight">
                    {capability.title}
                  </h3>
                  <p className="text-lg text-gray-500 font-medium mb-10 leading-relaxed max-w-sm">
                    {capability.description}
                  </p>

                  {/* Visual */}
                  <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6 border border-white shadow-sm mb-10">
                    {capability.visual}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-3 text-sm font-black text-premium-black uppercase tracking-widest group-hover:gap-5 transition-all cursor-pointer">
                    <span>Explore Feature</span>
                    <ArrowRight className="w-5 h-5 text-indigo-600" />
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