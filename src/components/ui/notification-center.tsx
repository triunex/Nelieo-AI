
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertCircle, Info, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemoveNotification: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemoveNotification
}) => {
  const [open, setOpen] = useState(false);
  
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  const getIconForType = (type: NotificationType) => {
    switch(type) {
      case 'success': return <Check className="text-green-500" size={16} />;
      case 'warning': return <AlertCircle className="text-yellow-500" size={16} />;
      case 'error': return <X className="text-red-500" size={16} />;
      case 'info':
      default: return <Info className="text-blue-500" size={16} />;
    }
  };
  
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-full"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 md:w-96 p-0 bg-black/90 border-white/10 backdrop-blur-lg"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMarkAllAsRead}
              className="text-xs hover:bg-white/10"
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px] p-2">
          {notifications.length > 0 ? (
            <AnimatePresence initial={false}>
              {notifications.map(notification => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`mb-2 p-3 rounded-md ${notification.read ? 'bg-white/5' : 'bg-white/10'}`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-white/10">
                      {getIconForType(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-400">{notification.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {!notification.read && (
                          <Badge 
                            variant="outline" 
                            className="bg-blue-500/10 text-blue-400 text-[10px] py-0 h-5"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Bell size={24} className="text-gray-400" />
              </div>
              <h4 className="font-medium mb-1">No notifications</h4>
              <p className="text-sm text-gray-400">You're all caught up!</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;
