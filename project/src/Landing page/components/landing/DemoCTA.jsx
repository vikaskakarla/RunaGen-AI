import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, CheckCircle } from "lucide-react";

export default function DemoCTA() {
  const navigate = useNavigate();
  return (
    <section className="py-32 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-50 rounded-[4rem] p-12 md:p-24 relative overflow-hidden flex flex-col items-center text-center">
          {/* Background Gradient */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 max-w-4xl space-y-10"
          >
            <span className="text-sm font-black tracking-[0.3em] text-indigo-600 uppercase block">Ready to Begin?</span>

            <h2 className="text-5xl md:text-8xl font-black font-outfit text-premium-black leading-[0.9] tracking-tight">
              Transform Your <br />
              <span className="premium-gradient">Career Today</span>
            </h2>

            <p className="text-2xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Experience the power of Gemini AI. Start your journey with the world's most intelligent career companion.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row justify-center gap-6 pt-6"
            >
              <Button
                size="lg"
                className="bg-premium-black hover:bg-black text-white text-xl px-12 py-8 rounded-[2rem] transition-all duration-300 transform hover:scale-105 hover:shadow-3xl group border border-white/10"
                onClick={() => navigate('/signup')}
              >
                Get Started for Free
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-xl px-12 py-8 rounded-[2rem] border-2 border-gray-200 hover:bg-white transition-all duration-300"
              >
                <Play className="w-6 h-6 mr-3 fill-indigo-600 text-indigo-600" />
                See Demo
              </Button>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-10 pt-10 border-t border-gray-100">
              {["Secure Setup", "No Card Required", "AI Powered"].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-black text-gray-500 uppercase tracking-widest">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}