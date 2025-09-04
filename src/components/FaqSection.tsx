import React from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FaqSection = () => {
  const faqs = [
    {
      question: "How does Nelieo AI differ from traditional search engines?",
      answer:
        "Unlike traditional search engines that return a list of links, Nelieo AI processes information from multiple sources in real-time and generates a comprehensive, AI-synthesized answer. We provide direct answers with source citations, eliminating the need to click through multiple websites.",
    },
    {
      question: "How accurate and reliable are Nelieo AI's answers?",
      answer:
        "Nelieo AI pulls information from reputable sources across the web and uses advanced AI to synthesize accurate answers. We always provide source citations so you can verify information. While our AI is highly reliable, we recommend reviewing sources for critical decisions, as with any AI system.",
    },
    {
      question: "Can I use Nelieo AI for academic research?",
      answer:
        "Yes! Nelieo AI is an excellent tool for academic research, providing comprehensive overviews of topics with cited sources. The Pro plan offers more detailed citation support and higher search limits, making it ideal for researchers. However, we recommend verifying information through primary sources for formal academic work.",
    },
    {
      question: "What types of questions can I ask Nelieo AI?",
      answer:
        "You can ask virtually anything you'd search for online: factual questions, how-to guides, explanations of complex topics, current events, comparative analyses, and more. Nelieo AI excels at synthesizing information from multiple sources to provide comprehensive answers to complex questions.",
    },
    {
      question: "How recent is the information Nelieo AI provides?",
      answer:
        "Nelieo AI searches the web in real-time, so the information is as current as the available online sources. For breaking news and very recent events, the comprehensiveness may vary based on what has been published and indexed online.",
    },
    {
      question: "How does the free plan limit differ from the Pro plan?",
      answer:
        "The free plan offers 10 searches per day with standard quality results. The Pro plan provides unlimited searches, enhanced search quality with more comprehensive answers, priority response speeds, custom search domains, and additional features like API access and in-depth citation analysis.",
    },
  ];

  return (
    <motion.section
      id="faq"
      className="py-16 md:py-24 relative"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-gray-300">
            Everything you need to know about Nelieo AI and how it works.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
            >
              <AccordionItem
                value={`item-${index}`}
                className="border-b border-white/10 py-2"
              >
                <AccordionTrigger className="text-left text-lg font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        <div className="mt-10 text-center">
          <p className="text-gray-300">
            Have more questions?{" "}
            <a href="#contact" className="text-blue-400 hover:underline">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </motion.section>
  );
};

export default FaqSection;
