import React from "react";
import { Search, Link, FileText, Clock } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: <Search className="h-6 w-6 text-blue-400" />,
      title: "Real-time Web Search",
      description:
        "Instantly search across the entire web for the most relevant and up-to-date information.",
    },
    {
      icon: <FileText className="h-6 w-6 text-purple-400" />,
      title: "Comprehensive Summaries",
      description:
        "Get concise AI-generated summaries that distill complex topics into clear, understandable explanations.",
    },
    {
      icon: <Link className="h-6 w-6 text-blue-400" />,
      title: "Source Citations",
      description:
        "Every insight is backed by reliable sources with direct links, so you can verify information and dive deeper.",
    },
    {
      icon: <Clock className="h-6 w-6 text-purple-400" />,
      title: "Instant Answers",
      description:
        "Save time with immediate responses to your questions without needing to sift through multiple search results.",
    },
  ];

  return (
    <section id="features" className="py-16 md:py-24 relative">
      <div className="absolute top-0 right-0 -mt-20 w-72 h-72 bg-purple-500/10 rounded-full filter blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Makes <span className="gradient-text">Nelieo.AI</span> Special
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Our AI assistant combines the breadth of search engines with the
            intelligence of large language models to deliver an unparalleled
            information discovery experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card p-6 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/5"
            >
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
