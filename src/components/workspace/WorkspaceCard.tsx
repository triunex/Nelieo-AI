
import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Users } from 'lucide-react';

interface WorkspaceProps {
  workspace: {
    id: string;
    name: string;
    description: string;
    members: number;
    lastUpdated: Date;
  };
  onSelect: () => void;
}

const WorkspaceCard = ({ workspace, onSelect }: WorkspaceProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="h-full"
    >
      <Card 
        className="cursor-pointer h-full flex flex-col border-white/10 hover:border-purple-500/50 transition-colors duration-300 overflow-hidden bg-gradient-to-br from-black/40 to-purple-900/10"
        onClick={onSelect}
      >
        <div className="h-2 w-full bg-gradient-to-r from-purple-600 to-blue-500" />
        
        <CardContent className="flex-1 p-5">
          <h3 className="font-semibold text-xl mb-2">{workspace.name}</h3>
          <p className="text-sm text-gray-400 mb-4">{workspace.description}</p>
          
          <div className="inline-flex items-center px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs">
            <Users size={12} className="mr-1" />
            {workspace.members} {workspace.members === 1 ? 'member' : 'members'}
          </div>
        </CardContent>
        
        <CardFooter className="border-t border-white/5 py-3 px-5">
          <div className="text-xs text-gray-400">
            Last updated {format(workspace.lastUpdated, 'MMM d, yyyy')}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default WorkspaceCard;
