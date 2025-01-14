'use client'

import { useRef } from 'react'
import Hero from '../components/Hero'
import Features from '../components/Features'
import Pricing from '../components/Pricing'
import Expandable from '@/components/Expandable'
import ChevronButton from '@/components/ui/ChevronButton'
import { Card } from "@/components/ui/card"

export default function Home() {
  const featuresRef = useRef<HTMLDivElement>(null)
  const expandableRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-100 to-white">
      <section className="relative h-screen w-full flex flex-col justify-center items-center px-4">
        <Card className="container mx-auto p-6 shadow-lg">
          <Hero />
        </Card>
      </section>

    </main>
  )
}

