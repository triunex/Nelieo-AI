import React from "react";

const AILoader: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-4">
      <div className="w-6 h-6 border-2 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin" />
    </div>
  );
};

export default AILoader;
