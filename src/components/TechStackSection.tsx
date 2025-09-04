import React from "react";

const TechStackSection = () => {
  const technologies = [
    {
      name: "Large Language Models",
      description:
        "State-of-the-art AI models for understanding and generating text",
    },
    {
      name: "Real-time Web Search",
      description:
        "Custom search algorithm for retrieving the most relevant information",
    },
    {
      name: "Vector Embeddings",
      description:
        "Advanced mathematical representations to understand semantic meaning",
    },
    {
      name: "Knowledge Retrieval",
      description: "Efficient information extraction from multiple sources",
    },
    {
      name: "NLP Processing",
      description:
        "Sophisticated natural language processing for understanding context",
    },
    {
      name: "Citation Analysis",
      description: "Automated source validation and reference generation",
    },
  ];

  return (
    <section id="tech-stack" className="py-16 md:py-24 relative bg-black/30">
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/10 to-transparent opacity-30"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powered by Advanced{" "}
            <span className="gradient-text">Technology</span>
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Our AI assistant combines cutting-edge technologies to deliver
            accurate, comprehensive answers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <div key={index} className="glass-card p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mr-3">
                  <span className="font-bold gradient-text">{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold glow-text-purple">
                  {tech.name}
                </h3>
              </div>
              <p className="text-gray-300">{tech.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <div className="glass-card p-6 max-w-3xl text-center">
            <h3 className="text-xl font-semibold mb-3">
              Our Engineering Commitment
            </h3>
            <p className="text-gray-300">
              We continuously improve our AI models and search algorithms to
              deliver more accurate, comprehensive, and up-to-date information.
              Our technology is built with a focus on reliability, speed, and
              source transparency.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
