import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { motion } from "framer-motion";

const ContactSection = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured() && supabase) {
        // Send email via Supabase Edge Function
        const { error } = await supabase.functions.invoke(
          "send-waitlist-email",
          {
            body: { email },
          }
        );

        if (error) throw error;
      }

      // Always show success for demo purposes
      setIsSubmitting(false);
      setEmail("");
      toast({
        title: "Thank you for joining our waitlist!",
        description: "We'll notify you when you get access to Cognix AI.",
      });
    } catch (error) {
      console.error("Error submitting to waitlist:", error);
      setIsSubmitting(false);
      toast({
        title: "Error joining waitlist",
        description:
          "There was a problem submitting your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured() && supabase) {
        // Send email via Supabase Edge Function
        const { error } = await supabase.functions.invoke(
          "send-contact-email",
          {
            body: {
              name,
              email,
              message,
              recipientEmail: "sharmashorya934@gmail.com", // Your email address
            },
          }
        );

        if (error) throw error;
      }

      // Always show success for demo purposes
      setIsSubmitting(false);
      setName("");
      setEmail("");
      setMessage("");
      toast({
        title: "Message received!",
        description: "We'll get back to you as soon as possible.",
      });
    } catch (error) {
      console.error("Error sending contact message:", error);
      setIsSubmitting(false);
      toast({
        title: "Error sending message",
        description:
          "There was a problem submitting your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.section id="contact" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Our <span className="gradient-text">Waitlist</span>
            </h2>
            <p className="text-gray-300 mb-8">
              Sign up to get early access to Nelieo AI and be among the first to
              experience the future of intelligent search.
            </p>

            <form onSubmit={handleWaitlistSubmit} className="max-w-md">
              <div className="flex flex-col sm:flex-row gap-3 mb-1">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/5 border-white/10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                >
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                We'll never share your email. Unsubscribe at any time.
              </p>
            </form>

            <motion.div
              className="mt-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-xl font-semibold mb-3">
                Contact Information
              </h3>
              <div className="space-y-2 text-gray-300">
                <p>Email: triunex.shorya@gmail.com</p>
                <p>Support: triunex.work@gmail.com</p>
                <p>Location: Delhi, INDIA</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get in <span className="gradient-text">Touch</span>
            </h2>
            <p className="text-gray-300 mb-8">
              Have questions about Nelieo AI? We'd love to hear from you! Send
              us a message and we'll respond as soon as possible.
            </p>

            <form
              onSubmit={handleContactSubmit}
              className="glass-card p-6 rounded-xl"
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-1"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    className="bg-white/5 border-white/10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-1"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="bg-white/5 border-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium mb-1"
                  >
                    Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Your message..."
                    className="bg-white/5 border-white/10 min-h-[120px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Founder attribution */}
      <motion.div
        className="mt-20 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="inline-block relative">
          <div className="relative z-10">
            <p className="text-sm text-gray-400 mb-2">
              Crafted with precision by
            </p>
            <motion.h3
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400"
              animate={{
                backgroundPosition: ["0% center", "100% center"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              Shourya Sharma
            </motion.h3>
            <p className="text-sm text-gray-400 mt-1">Founder & CEO</p>
          </div>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        </div>
      </motion.div>
    </motion.section>
  );
};

export default ContactSection;
