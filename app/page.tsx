import Hero from '../components/Hero' 
import Features from '../components/Features'
import Pricing from '../components/Pricing'
import Expandable from '@/components/Expandable'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-100 to-white">
      <Hero />
      <Features />
      <Expandable />
      <Pricing />
    </main>
  )
}

