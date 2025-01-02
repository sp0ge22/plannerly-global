import { Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const tiers = [
  {
    name: 'Starter',
    id: 'tier-starter',
    href: '#',
    priceMonthly: '$29',
    description: 'Perfect for small teams just getting started.',
    features: [
      'Up to 5 team members',
      'Basic task management',
      'Limited resource organization',
      '24-hour support response time',
    ],
    mostPopular: false,
  },
  {
    name: 'Professional',
    id: 'tier-professional',
    href: '#',
    priceMonthly: '$99',
    description: 'Ideal for growing teams that need more power.',
    features: [
      'Up to 20 team members',
      'Advanced AI-powered task management',
      'Unlimited resource organization',
      'AI-assisted communication tools',
      '4-hour support response time',
    ],
    mostPopular: true,
  },
  {
    name: 'Enterprise',
    id: 'tier-enterprise',
    href: '#',
    priceMonthly: 'Custom',
    description: 'Tailored solutions for large organizations.',
    features: [
      'Unlimited team members',
      'Full AI-powered feature suite',
      'Advanced analytics and reporting',
      'Dedicated account manager',
      '1-hour support response time',
      'Custom integrations',
    ],
    mostPopular: false,
  },
]

export default function Pricing() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-black">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose the right plan for your team
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Choose an affordable plan that's packed with the best features for engaging your audience, creating customer loyalty, and driving sales.
        </p>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier, tierIdx) => (
            <Card
              key={tier.id}
              className={`${
                tier.mostPopular
                  ? 'ring-2 ring-black shadow-md'
                  : 'ring-1 ring-gray-200'
              } rounded-3xl p-8 xl:p-10`}
            >
              <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                  {tier.name}
                </CardTitle>
                <CardDescription className="mt-4 text-sm leading-6 text-gray-600">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">{tier.priceMonthly}</span>
                {tier.name !== 'Enterprise' && <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>}
              </CardContent>
              <CardFooter className="mt-6">
                <Button className="w-full" variant={tier.mostPopular ? "default" : "outline"}>
                  {tier.name === 'Enterprise' ? 'Contact sales' : 'Get started'}
                </Button>
              </CardFooter>
              <CardContent className="mt-8">
                <ul role="list" className="space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-black" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

