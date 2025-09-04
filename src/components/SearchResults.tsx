import React from "react";
import { motion } from "framer-motion";

interface SearchResultsProps {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    description: string;
    publishDate?: string;
  }>;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  answer,
  sources,
}) => {
  return (
    <div className="search-results">
      <div className="answer-section">
        <h2 className="text-lg font-semibold mb-2">Answer</h2>
        <p className="text-gray-300">{answer}</p>
      </div>

      {sources.length > 0 && (
        <div className="sources-section mt-6">
          <h3 className="text-lg font-semibold mb-3">Source Citations:</h3>
          <div className="space-y-4">
            {sources.map((source, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="source-item p-4 bg-gradient-to-br from-purple-800/30 to-gray-800/30 border border-purple-500/20 rounded-lg shadow-md"
              >
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm font-medium hover:underline"
                >
                  {source.title}
                </a>
                <p className="source-description text-gray-400 text-sm mt-2">
                  {source.description}
                </p>
                {source.publishDate && (
                  <small className="text-gray-500 text-xs">
                    Published: {source.publishDate}
                  </small>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
