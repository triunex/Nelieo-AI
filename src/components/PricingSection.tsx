import React from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Basic access for casual users",
      features: [
        "150 AI searches per day",
        "Standard search quality",
        "Web-based access only",
        "Basic citation support",
        "Standard response speed",
        "Access to Standard AI models",
        "Unlimited use of AI Chat and Voice assistant",
        "6 Agentic Tasks credit for Agentic intelligence",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Pro",
      price: "$15",
      period: "per month",
      description: "Perfect for power users and researchers",
      features: [
        "Unlimited AI searches",
        "Enhanced search quality",
        "Web, mobile & API access",
        "In-depth citation analysis",
        "Priority response speed",
        "Custom search domains",
        "No ads or tracking",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "default",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For organizations with advanced needs",
      features: [
        "Everything in Pro plan",
        "Dedicated instance",
        "Custom AI training",
        "SSO & team management",
        "Custom integrations",
        "Premium support",
        "Usage reporting & analytics",
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-24 relative">
      <div className="absolute bottom-0 left-0 -mb-32 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Choose the plan that's right for you. All plans include our core
            technology with different limits and perks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`glass-card rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-purple-500/10 relative ${
                plan.popular ? "border-purple-500/50" : "border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className={`p-6 md:p-8 ${plan.popular ? "pt-10" : ""}`}>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 ml-2 text-sm">
                    /{plan.period}
                  </span>
                </div>
                <p className="text-gray-300 mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="rounded-full bg-purple-500/20 p-1 mr-3 flex-shrink-0">
                        <CheckIcon className="h-3 w-3 text-purple-400" />
                      </span>
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant as "outline" | "default"}
                  className={`w-full ${
                    plan.buttonVariant === "default"
                      ? "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                      : "hover:bg-white/5"
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm max-w-2xl mx-auto">
            All plans include a 14-day money-back guarantee. Need a custom
            solution?
            <a href="#contact" className="text-blue-400 hover:underline ml-1">
              Contact our sales team
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
