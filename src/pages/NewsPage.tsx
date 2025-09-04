import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

const NewsPage = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const categories = ["Latest", "Tech", "AI", "Business", "Sports", "Politics"];
  const [selectedCategory, setSelectedCategory] = useState("Latest");

  useEffect(() => {
    fetch(
      `https://cognix-api.onrender.com/api/news?category=${selectedCategory}&limit=50` // Increase limit to fetch up to 50 articles
    )
      .then((res) => res.json())
      .then((data) => setNews(data.articles || []));
  }, [selectedCategory]);

  const readNews = (text: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
  };

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      {/* Logo centered, bigger */}
      <div className="flex justify-center mb-4">
        <img src="/favicon.png" alt="CogniX Logo" style={{ height: 80 }} />
      </div>

      {/* Categories centered */}
      <div className="flex flex-wrap gap-3 mb-6 justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`relative px-4 py-1 rounded-full text-sm font-medium transition-all duration-200 border ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-muted text-foreground hover:bg-muted/80 border-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {news.map((article, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            className="break-inside-avoid bg-card rounded-2xl p-4 backdrop-blur-lg transition-transform transform hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] duration-300 border border-border cursor-pointer"
            onClick={() => navigate("/news/article", { state: article })}
          >
            {article.thumbnail && (
              <img
                src={article.thumbnail
                  .replace(/w\d+-h\d+/g, "w1200-h800")
                  .replace(/=s\d+/, "=s1200")}
                alt="thumbnail"
                className="w-full h-48 object-cover rounded-xl mb-4 shadow-md"
                style={{
                  imageRendering: "auto",
                  filter: "none",
                  objectFit: "cover",
                  objectPosition: "center",
                  WebkitFilter: "none",
                  MozOsxFontSmoothing: "auto",
                }}
                loading="lazy"
                draggable={false}
              />
            )}
            <h2 className="text-lg font-semibold mb-1">{article.title}</h2>
            <p className="text-sm text-muted-foreground mb-3">
              {article.snippet}
            </p>

            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{article.source}</span>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{article.date}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;
