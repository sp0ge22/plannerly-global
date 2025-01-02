import { Lightbulb, Zap, Code, Rocket, PenToolIcon as Tool, Globe, Clock, CreditCard } from 'lucide-react'

const expansionIdeas = [
  {
    icon: Tool,
    title: "Custom Tools",
    description: "AI designs and builds bespoke tools that seamlessly integrate with your dashboard's functionality."
  },
  {
    icon: Clock,
    title: "Rapid Development",
    description: "AI accelerates the development process, delivering custom tools in a fraction of the time compared to traditional methods."
  },
  {
    icon: Globe,
    title: "Marketplace Potential",
    description: "Create tools unique to your business that can be sold to others, with proceeds shared with you."
  },
  {
    icon: CreditCard,
    title: "Cost-Effective Solutions",
    description: "AI-driven development significantly reduces costs, making custom tools accessible to businesses of all sizes."
  }
]

const howItWorksSteps = [
  {
    number: 1,
    icon: Lightbulb,
    title: "Ideation",
    description: "Describe your idea for a new tool or dashboard extension. Our AI understands your needs and vision."
  },
  {
    number: 2,
    icon: Zap,
    title: "AI Analysis",
    description: "Our advanced AI analyzes your request, considering your existing dashboard and best practices."
  },
  {
    number: 3,
    icon: Code,
    title: "Rapid Development",
    description: "The AI swiftly designs and builds your custom tool, optimizing it for seamless integration."
  },
  {
    number: 4,
    icon: Rocket,
    title: "Instant Deployment",
    description: "Your new tool is immediately available in your dashboard, ready for you to use and customize further."
  }
]

export default function Expandable() {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-black font-semibold tracking-wide uppercase">Expandable</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            AI-Powered Dashboard Expansion
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Leverage AI to build new tools and extensions for your dashboard quickly and affordably.
          </p>
        </div>

        <div className="mt-20">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {expansionIdeas.map((idea) => (
              <div key={idea.title} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-black text-white">
                    <idea.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{idea.title}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">{idea.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-32">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-16">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {howItWorksSteps.map((step) => (
              <div key={step.title} className="relative bg-gray-50 p-6 rounded-lg">
                <div className="absolute top-0 left-0 -mt-4 -ml-4 w-12 h-12 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {step.number}
                </div>
                <div className="flex items-center mb-4">
                  <step.icon className="h-8 w-8 text-black mr-4" aria-hidden="true" />
                  <h4 className="text-xl font-medium text-gray-900">{step.title}</h4>
                </div>
                <p className="text-base text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 text-center">
          <a
            href="#"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800"
          >
            Start Expanding Your Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

