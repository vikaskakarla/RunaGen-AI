import React from "react";
import { motion } from "framer-motion";
import { FileText, TrendingUp, Brain, Target, CheckCircle, Sparkles } from "lucide-react";

export default function FeatureShowcase() {
  const features = [
    {
      title: "AI-Powered Resume Analysis",
      description: "Upload your resume and let our AI parse every detail. We extract skills, experience, and qualifications, then match you with the perfect opportunities.",
      points: [
        "Intelligent parsing of PDF, Word, and image formats",
        "Skill gap detection with confidence scores",
        "Real-time job matching dashboard",
        "ATS optimization recommendations"
      ],
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop"
    },
    {
      title: "Personalized Learning Roadmaps",
      description: "Get a customized learning path based on your goals and current skills. We integrate with top platforms to bring you the best content.",
      points: [
        "Integration with YouTube, Coursera, Udemy",
        "Prioritized skill recommendations",
        "Progress tracking and milestones",
        "Adaptive learning based on performance"
      ],
      icon: TrendingUp,
      gradient: "from-purple-500 to-pink-500",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop"
    },
    {
      title: "AI Career Mentor",
      description: "Chat with your personal AI mentor powered by Google's Gemini. Get contextual advice, career guidance, and answers to all your professional questions.",
      points: [
        "Context-aware conversations with RAG",
        "Persistent chat memory across sessions",
        "Badge-based engagement system",
        "24/7 availability for instant guidance"
      ],
      icon: Brain,
      gradient: "from-indigo-500 to-purple-500",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop"
    },
    {
      title: "Career Simulations",
      description: "Practice makes perfect. Engage in realistic job scenarios, receive AI feedback, and build confidence before your next big opportunity.",
      points: [
        "Realistic workplace scenarios",
        "Instant AI-powered feedback",
        "Completion metrics and analytics",
        "Skill-based outcome tracking"
      ],
      icon: Target,
      gradient: "from-orange-500 to-red-500",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop"
    }
  ];

  return (
    <section className="py-32 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-48">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isEven = index % 2 === 0;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-20`}
            >
              {/* Content */}
              <div className="lg:w-1/2 space-y-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: isEven ? -20 : 20 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className={`w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-10 border border-gray-100`}>
                    <Icon className="w-7 h-7 text-indigo-600" />
                  </div>

                  <h3 className="text-5xl md:text-6xl font-black font-outfit text-premium-black mb-8 leading-tight tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="text-2xl text-gray-400 font-medium mb-12 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    {feature.points.map((point, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 transition-all group-hover:w-4 group-hover:rounded-sm" />
                        <span className="text-gray-600 font-bold uppercase text-xs tracking-widest">{point}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Visual */}
              <div className="lg:w-1/2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="relative"
                >
                  {/* Abstract Background Element */}
                  <div className={`absolute -inset-10 bg-gradient-to-tr ${feature.gradient} opacity-10 rounded-[4rem] blur-3xl`} />

                  {/* Image/Mockup Container */}
                  <div className="relative bg-white p-4 rounded-[3rem] shadow-3xl border border-gray-50 overflow-hidden transform hover:scale-[1.02] transition-transform duration-700">
                    <div className="aspect-[4/3] rounded-[2rem] overflow-hidden">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}