
import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface DocumentProps {
  document: {
    id: string;
    title: string;
    description: string;
    lastEdited: Date;
    workspace: string;
    tags: string[];
  };
}

const DocumentCard = ({ document }: DocumentProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="h-full"
    >
      <Card className="cursor-pointer h-full flex flex-col border-white/10 hover:border-blue-500/50 transition-colors duration-300 bg-gradient-to-br from-black/40 to-blue-900/10">
        <CardContent className="flex-1 p-5 pt-6">
          <div className="flex items-start justify-between mb-3">
            <FileText className="text-blue-400 h-5 w-5" />
            <div className="px-2 py-1 rounded text-xs bg-white/10 text-gray-300">
              {document.workspace}
            </div>
          </div>
          
          <h3 className="font-semibold text-lg mb-2">{document.title}</h3>
          <p className="text-sm text-gray-400 mb-4">{document.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {document.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="bg-white/5">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="border-t border-white/5 py-3 px-5">
          <div className="text-xs text-gray-400">
            Last edited {format(document.lastEdited, 'MMM d, yyyy')}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default DocumentCard;
