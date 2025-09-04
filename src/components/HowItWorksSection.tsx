import React from "react";
import { motion } from "framer-motion";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      title: "Submit Your Query",
      description:
        "Type any question into the search bar. Our system accepts complex questions, simple inquiries, and everything in between.",
    },
    {
      number: "02",
      title: "Real-time Web Search",
      description:
        "Our AI instantly searches the web for the most relevant and up-to-date information from trusted sources.",
    },
    {
      number: "03",
      title: "AI Analysis & Synthesis",
      description:
        "Our advanced language model processes and understands the information, identifying key insights and connections.",
    },
    {
      number: "04",
      title: "Comprehensive Answer",
      description:
        "You receive a complete answer with citations, allowing you to explore sources further if desired.",
    },
  ];

  return (
    <motion.section
      id="how-it-works"
      className="py-16 md:py-24 relative overflow-hidden bg-black/30"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/10 to-transparent opacity-30"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How <span className="gradient-text">NelieoAI</span> Works
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Our technology combines advanced web search capabilities with
            state-of-the-art AI to deliver accurate, comprehensive answers to
            your questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div className="glass-card p-6 md:p-8 rounded-xl h-full flex flex-col">
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-700">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3 glow-text-purple">
                  {step.title}
                </h3>
                <p className="text-gray-300 flex-grow">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 right-0 transform translate-x-1/2 w-4 h-4 rounded-full border-2 border-purple-500 bg-background z-10"></div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="glass-card inline-block px-6 py-3 max-w-2xl">
            <p className="text-lg">
              <span className="glow-text-blue font-medium">
                Our Technology Stack:
              </span>{" "}
              Next-generation language models, real-time web crawling, natural
              language processing, and advanced ranking algorithms
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSection;
