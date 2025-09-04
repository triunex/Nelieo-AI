import React from "react";

const ChartLoader: React.FC = () => {
  return (
    <div className="flex justify-center items-end h-16 space-x-1 py-4">
      {[4, 8, 12, 8, 4].map((height, idx) => (
        <div
          key={idx}
          className="w-2 bg-gradient-to-t from-purple-500 to-blue-500 rounded"
          style={{
            animation: `growBar 1s ease-in-out ${
              idx * 0.1
            }s infinite alternate`,
            height: `${height * 2}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes growBar {
          0% { transform: scaleY(0.5); opacity: 0.5; }
          100% { transform: scaleY(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ChartLoader;
