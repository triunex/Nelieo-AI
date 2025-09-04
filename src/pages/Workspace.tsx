import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  PlusCircle,
  Users,
  FileText,
  Brain,
  Share2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import WorkspaceCard from "@/components/workspace/WorkspaceCard";
import DocumentCard from "@/components/workspace/DocumentCard";
import TeamMembersList from "@/components/workspace/TeamMembersList";
import CreateWorkspaceDialog from "@/components/workspace/CreateWorkspaceDialog";

const Workspace = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Sample data for workspaces
  const [workspaces] = useState([
    {
      id: "1",
      name: "Product Research",
      description: "Market analysis and competitor research",
      members: 4,
      lastUpdated: new Date(2025, 4, 12),
    },
    {
      id: "2",
      name: "Content Strategy",
      description: "Blog posts and social media planning",
      members: 2,
      lastUpdated: new Date(2025, 4, 15),
    },
  ]);

  // Sample data for documents
  const [documents] = useState([
    {
      id: "1",
      title: "AI Market Analysis",
      description: "Overview of current AI landscape and opportunities",
      lastEdited: new Date(2025, 4, 16),
      workspace: "Product Research",
      tags: ["Research", "AI", "Market"],
    },
    {
      id: "2",
      title: "Competitor Feature Comparison",
      description: "Detailed analysis of competitor products",
      lastEdited: new Date(2025, 4, 15),
      workspace: "Product Research",
      tags: ["Competitors", "Features"],
    },
    {
      id: "3",
      title: "Q2 Content Calendar",
      description: "Content themes and schedule for Q2",
      lastEdited: new Date(2025, 4, 10),
      workspace: "Content Strategy",
      tags: ["Planning", "Content"],
    },
  ]);

  const [teamMembers] = useState([
    { id: "1", name: "Alex Morgan", role: "Project Lead", avatar: null },
    { id: "2", name: "Jamie Chen", role: "Researcher", avatar: null },
    {
      id: "3",
      name: "Riley Johnson",
      role: "Content Specialist",
      avatar: null,
    },
    { id: "4", name: "Taylor Smith", role: "Data Analyst", avatar: null },
  ]);

  const handleCreateWorkspace = (data) => {
    // In a real app, you would save this to a database
    toast({
      title: "Workspace Created",
      description: `${data.name} workspace has been created successfully.`,
    });
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-40"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <span className="font-bold text-white">C</span>
              </div>
              <span className="font-bold text-xl hidden sm:inline-block">
                Cognix<span className="glow-text-purple">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/search")}
            >
              Search
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
            >
              Profile
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <motion.div
          className="flex items-center gap-2 mb-6"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/search"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to search</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
                <Users className="hidden sm:block" size={28} />
                Team Workspaces
              </h1>
              <p className="text-gray-400">
                Collaborate and share knowledge with your team
              </p>
            </div>

            <motion.div
              className="mt-4 md:mt-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Workspace
              </Button>
            </motion.div>
          </div>

          <Tabs defaultValue="workspaces" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger
                value="workspaces"
                className="flex items-center gap-2"
              >
                <Users size={16} />
                <span>Workspaces</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                className="flex items-center gap-2"
              >
                <Brain size={16} />
                <span>Knowledge Base</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Share2 size={16} />
                <span>Team</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workspaces">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {workspaces.map((workspace) => (
                  <motion.div
                    key={workspace.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="transition-shadow hover:shadow-lg shadow-purple-800/10"
                  >
                    <WorkspaceCard
                      workspace={workspace}
                      onSelect={() => navigate(`/workspace/${workspace.id}`)}
                    />
                  </motion.div>
                ))}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="transition-shadow hover:shadow-lg shadow-purple-800/10"
                >
                  <Card
                    className="border-dashed border-white/20 hover:border-white/40 cursor-pointer h-full flex flex-col items-center justify-center py-8 bg-black/20"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <div className="flex flex-col items-center gap-4 text-center p-4">
                      <div className="rounded-full p-3 bg-white/5">
                        <PlusCircle className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          Create Workspace
                        </h3>
                        <p className="text-sm text-gray-400">
                          Start a new collaborative space
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Card
                    className="border-dashed border-white/20 hover:border-white/40 cursor-pointer h-full flex flex-col items-center justify-center py-8 bg-black/20"
                    onClick={() =>
                      toast({
                        title: "Coming Soon",
                        description:
                          "Document creation will be available soon!",
                      })
                    }
                  >
                    <div className="flex flex-col items-center gap-4 text-center p-4">
                      <div className="rounded-full p-3 bg-white/5">
                        <PlusCircle className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          Create Document
                        </h3>
                        <p className="text-sm text-gray-400">
                          Start a new AI-powered document
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="knowledge">
              <Card className="border-border/40 bg-black/20 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Knowledge Base</CardTitle>
                  <CardDescription>
                    Your AI-powered second brain stores all your research and
                    conversations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-6 text-center border border-dashed rounded-lg border-white/20">
                      <Brain className="w-12 h-12 mx-auto text-purple-400 mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Your Knowledge Base is Building
                      </h3>
                      <p className="text-sm text-gray-400 max-w-md mx-auto">
                        As you search and ask questions with Cognix AI, we'll
                        automatically organize and store important information
                        for easy reference.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Recently Added Knowledge</h3>
                      <div className="grid gap-2">
                        <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="text-sm font-medium">
                            AI Market Trends 2025
                          </div>
                          <div className="text-xs text-gray-400">
                            Added 2 days ago • From AI Market Analysis document
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="text-sm font-medium">
                            Competitor Feature Comparison
                          </div>
                          <div className="text-xs text-gray-400">
                            Added 3 days ago • From Search
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="border-border/40 bg-black/20 backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle className="text-xl">Team Members</CardTitle>
                      <CardDescription>
                        People you're collaborating with
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] pr-4">
                        <TeamMembersList members={teamMembers} />
                      </ScrollArea>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          toast({
                            title: "Coming Soon",
                            description:
                              "Team member management will be available soon!",
                          })
                        }
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Invite Team Members
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                <div>
                  <Card className="border-border/40 bg-black/20 backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle className="text-xl">Activity</CardTitle>
                      <CardDescription>Recent team activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-400">Today</div>
                          <div className="bg-white/5 p-3 rounded-lg">
                            <div className="text-sm">
                              Riley Johnson edited "Q2 Content Calendar"
                            </div>
                            <div className="text-xs text-gray-400">
                              2 hours ago
                            </div>
                          </div>
                          <div className="bg-white/5 p-3 rounded-lg">
                            <div className="text-sm">
                              Alex Morgan created "Product Roadmap"
                            </div>
                            <div className="text-xs text-gray-400">
                              5 hours ago
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-400">Yesterday</div>
                          <div className="bg-white/5 p-3 rounded-lg">
                            <div className="text-sm">
                              Jamie Chen joined the team
                            </div>
                            <div className="text-xs text-gray-400">
                              1 day ago
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateWorkspace}
      />

      {/* Footer with creator attribution */}
      <motion.div
        className="py-8 border-t border-white/10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <div className="container mx-auto">
          <p className="text-sm text-gray-400">
            Built with 💜 by{" "}
            <motion.span
              className="font-medium text-purple-400"
              animate={{
                color: ["#c084fc", "#818cf8", "#60a5fa", "#c084fc"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              Shourya Sharma
            </motion.span>
            , Founder & CEO
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Workspace;
