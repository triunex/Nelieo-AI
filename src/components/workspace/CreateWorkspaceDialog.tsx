import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Folder, User, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WorkspaceFormData) => void;
}

export interface WorkspaceFormData {
  name: string;
  description: string;
  visibility: 'private' | 'team' | 'public';
}

const CreateWorkspaceDialog = ({ open, onClose, onSubmit }: CreateWorkspaceDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: '',
    description: '',
    visibility: 'team',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVisibilityChange = (visibility: 'private' | 'team' | 'public') => {
    setFormData((prev) => ({
      ...prev,
      visibility,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Save to localStorage for demo mode
      const existingWorkspaces = JSON.parse(localStorage.getItem('cognix_workspaces') || '[]');
      const newWorkspace = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility,
        members: 1,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('cognix_workspaces', JSON.stringify([...existingWorkspaces, newWorkspace]));
      
      // If supabase is available and properly configured, save there too
      if (isSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Create a workspace record
            await supabase.from('workspaces').insert({
              name: formData.name,
              description: formData.description,
              visibility: formData.visibility,
              created_by: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Error saving to Supabase:', error);
          // Continue with local storage data even if Supabase fails
        }
      }
      
      onSubmit(formData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        visibility: 'team',
      });
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-border/40 bg-black/80 backdrop-blur-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Folder className="h-5 w-5" />
            <span>Create Workspace</span>
          </DialogTitle>
          <DialogDescription>
            Create a new workspace for collaboration and knowledge management
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter workspace name"
              className="bg-white/5"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What is this workspace about?"
              className="bg-white/5 min-h-[100px]"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-3 gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center p-3 rounded-lg border ${
                  formData.visibility === 'private' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
                onClick={() => handleVisibilityChange('private')}
              >
                <User className={`h-5 w-5 mb-1 ${formData.visibility === 'private' ? 'text-purple-400' : ''}`} />
                <span className="text-xs">Private</span>
              </motion.button>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center p-3 rounded-lg border ${
                  formData.visibility === 'team' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
                onClick={() => handleVisibilityChange('team')}
              >
                <Users className={`h-5 w-5 mb-1 ${formData.visibility === 'team' ? 'text-purple-400' : ''}`} />
                <span className="text-xs">Team</span>
              </motion.button>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center p-3 rounded-lg border ${
                  formData.visibility === 'public' 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
                onClick={() => handleVisibilityChange('public')}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-5 w-5 mb-1 ${formData.visibility === 'public' ? 'text-purple-400' : ''}`}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="text-xs">Public</span>
              </motion.button>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? "Creating..." : "Create Workspace"}
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkspaceDialog;
