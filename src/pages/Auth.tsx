import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Github,
  Mail,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth"; // Import useAuth hook
import bgGalaxy from "@/assets/bg-galaxy.jpg"; // Place your image in src/assets/bg-galaxy.jpg

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user from useAuth

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/search"); // Redirect to search if user is authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeUpdates, setAgreeUpdates] = useState(false);

  const handleAuth = async (type: "login" | "signup") => {
    if (!email || !password || (type === "signup" && !fullName)) {
      toast({
        title: "Error",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }

    if (type === "signup" && !agreeTerms) {
      toast({
        title: "Error",
        description: "You must agree to the terms",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (type === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      toast({
        title: type === "signup" ? "Account created" : "Welcome back!",
        description: "You're logged in successfully.",
      });

      navigate("/search"); // Ensure navigation happens after login success
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (
    providerType: "github" | "google" = "google"
  ) => {
    const provider = new GoogleAuthProvider(); // For now, always use Google as GitHub requires additional setup
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      toast({
        title: "Logged in with Google",
        description: `Welcome ${user.displayName || user.email}`,
      });

      navigate("/search");
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col md:flex-row items-center justify-center"
      style={{
        background:
          "linear-gradient(120deg, #18181b 0%, #181a20 60%, #101014 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left: Form */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center relative z-10">
        <motion.div
          className="absolute top-6 left-6"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to home</span>
          </Link>
        </motion.div>

        <motion.div
          className="w-full max-w-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              <Link to="/" className="flex items-center justify-center mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="font-bold text-white">N</span>
                </div>
                <span className="font-bold text-xl ml-2">
                  Nelieo<span className="glow-text-purple">AI</span>
                </span>
              </Link>
            </motion.div>
            <motion.h1
              className="text-2xl font-bold tracking-tight"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Welcome to Nelieo AI
            </motion.h1>
            <motion.p
              className="text-sm text-gray-400 mt-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              Sign in or create an account to continue
            </motion.p>
          </div>

          <motion.div
            className="w-full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Tabs defaultValue="login" className="w-full">
              <TabsList
                className="grid w-full grid-cols-2 mb-6"
                style={{
                  background:
                    "linear-gradient(90deg, #18181b 0%, #3b2562 100%)", // darker purple/navy blend
                  borderRadius: "0.75rem",
                  boxShadow: "0 2px 12px 0 rgba(24,24,27,0.18)",
                }}
              >
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white/90 data-[state=active]:text-black data-[state=inactive]:text-white transition-colors"
                  style={{
                    borderRadius: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-white/90 data-[state=active]:text-black data-[state=inactive]:text-white transition-colors"
                  style={{
                    borderRadius: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Sign up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="animate-fade-in">
                <Card className="border-border/40 bg-black/20 backdrop-blur-lg">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <LogIn size={18} />
                      <span>Login</span>
                    </CardTitle>
                    <CardDescription>
                      Enter your email and password to sign in
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => handleSocialAuth("github")}
                      >
                        <Github className="mr-2 h-4 w-4" />
                        <span>GitHub</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => handleSocialAuth("google")}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        <span>Google</span>
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-black px-2 text-gray-400">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white/5"
                      />
                    </motion.div>
                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs px-0"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/5 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-1"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  </CardContent>
                  <CardFooter>
                    <motion.div
                      className="w-full"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        className="w-full bg-gradient-to-r from-[#2d1a3a] to-[#1e293b] hover:from-[#23132d] hover:to-[#18181b]"
                        onClick={() => handleAuth("login")}
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign in"}
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="signup" className="animate-fade-in">
                <Card className="border-border/40 bg-black/20 backdrop-blur-lg">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <UserPlus size={18} />
                      <span>Create an account</span>
                    </CardTitle>
                    <CardDescription>
                      Enter your information to create an account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => handleSocialAuth("github")}
                      >
                        <Github className="mr-2 h-4 w-4" />
                        <span>GitHub</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => handleSocialAuth("google")}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        <span>Google</span>
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-black px-2 text-gray-400">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <Label htmlFor="fullName">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-white/5"
                      />
                    </motion.div>

                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <Label htmlFor="signup-email">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white/5"
                      />
                    </motion.div>

                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <Label htmlFor="signup-password">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/5 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-1"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Password must be at least 8 characters
                      </p>
                    </motion.div>

                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        type="text"
                        placeholder="Researcher, Developer, etc."
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="bg-white/5"
                      />
                    </motion.div>

                    <motion.div
                      className="space-y-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <Label htmlFor="userRole">I am a...</Label>
                      <Select value={userRole} onValueChange={setUserRole}>
                        <SelectTrigger className="bg-white/5">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="researcher">Researcher</SelectItem>
                          <SelectItem value="developer">Developer</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="entrepreneur">
                            Entrepreneur/Founder
                          </SelectItem>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="educator">Educator</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      className="space-y-4 pt-4"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    >
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          checked={agreeTerms}
                          onCheckedChange={(checked) =>
                            setAgreeTerms(checked as boolean)
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="terms"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I agree to the{" "}
                            <Link
                              to="#"
                              className="text-blue-400 hover:underline"
                            >
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                              to="#"
                              className="text-blue-400 hover:underline"
                            >
                              Privacy Policy
                            </Link>{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="updates"
                          checked={agreeUpdates}
                          onCheckedChange={(checked) =>
                            setAgreeUpdates(checked as boolean)
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="updates"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I want to receive updates about products, features,
                            and news
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  </CardContent>
                  <CardFooter>
                    <motion.div
                      className="w-full"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        className="w-full bg-gradient-to-r from-[#2d1a3a] to-[#1e293b] hover:from-[#23132d] hover:to-[#18181b]"
                        onClick={() => handleAuth("signup")}
                        disabled={isLoading}
                      >
                        {isLoading ? "Creating account..." : "Create account"}
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
      {/* Right: Image */}
      <div className="hidden md:flex w-1/2 h-[650px] items-center justify-center relative">
        <img
          src={bgGalaxy}
          alt="Galaxy"
          className="object-cover w-full h-full rounded-2xl shadow-2xl"
          style={{
            maxHeight: 650,
            minWidth: 400,
            borderRadius: "1.5rem",
            boxShadow: "0 8px 40px 0 rgba(80,40,180,0.25)",
          }}
        />
        {/* Optional: overlay for effect */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(90deg,rgba(24,24,27,0.1) 0%,rgba(24,24,27,0.6) 100%)",
          }}
        />
      </div>
    </motion.div>
  );
};

export default Auth;
