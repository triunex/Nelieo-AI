
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from 'framer-motion';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
}

interface TeamMembersListProps {
  members: TeamMember[];
}

const TeamMembersList = ({ members }: TeamMembersListProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-2"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {members.map((member) => (
        <motion.div 
          key={member.id}
          variants={item}
          className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Avatar>
            {member.avatar ? (
              <AvatarImage src={member.avatar} alt={member.name} />
            ) : (
              <AvatarFallback className="bg-purple-800/30">
                {getInitials(member.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="font-medium">{member.name}</div>
            <div className="text-sm text-gray-400">{member.role}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default TeamMembersList;
