import { 
  ClipboardDocumentListIcon, 
  LinkIcon, 
  ChatBubbleBottomCenterTextIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: ClipboardDocumentListIcon,
    title: "Smart Task Management",
    description: "Transform natural language instructions into well-structured tasks with AI-powered task creation and assignment.",
    details: [
      "AI converts informal descriptions into clear, actionable tasks",
      "Automatic task title and description generation",
      "Natural language smart task assignment - one input to create and assign tasks",
      "Real-time in-task messaging and team collaboration"
    ]
  },
  {
    icon: LinkIcon,
    title: "Centralized Resources",
    description: "Organize and manage your team's important links and resources with AI-powered categorization.",
    details: [
      "Smart Resource Management - AI auto-detects website details from a single input",
      "Automatic logo and metadata extraction",
      "Intelligent category suggestions and organization",
      "Custom categorization and resource tagging"
    ]
  },
  {
    icon: ChatBubbleBottomCenterTextIcon,
    title: "AI-Powered Communication",
    description: "Create and manage organization-wide email response prompts with AI assistance.",
    details: [
      "Smart prompt creation - AI generates response templates from one input",
      "Organization-wide prompt library for common scenarios",
      "Customizable AI response styles and tone settings",
      "Collaborative prompt editing and version management"
    ]
  },
  {
    icon: UserGroupIcon,
    title: "Seamless Collaboration",
    description: "Maintain your private workspace while selectively collaborating with other organizations.",
    details: [
      "Private organizational workspace with complete control",
      "Selective cross-organization collaboration without exposing internal data",
      "Flexible team hierarchy and permission management",
      "Smart workspace switching between your organization and partners"
    ]
  }
]

export default function Features() {
  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-black font-semibold tracking-wide uppercase">Features</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            A better way to manage your team
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Our AI-powered platform streamlines your workflow and boosts productivity.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {features.map((feature) => (
              <div key={feature.title} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-black text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.title}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  {feature.description}
                  <ul className="mt-4 list-disc list-inside space-y-2">
                    {feature.details.map((detail, index) => (
                      <li key={index} className="text-sm">{detail}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

