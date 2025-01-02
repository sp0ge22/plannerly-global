import Link from 'next/link'
import { ArrowRight, Zap, Shield, Users } from 'lucide-react'
import { Icons } from "@/components/ui/icons"

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white py-16 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Icons.logo className="h-16 w-16 text-primary" />
            <h1 className="text-6xl font-bold tracking-tight text-black">
              Plannerly
            </h1>
          </div>
          <p className="mx-auto mt-3 max-w-md text-xl text-gray-600 sm:text-2xl md:mt-5 md:max-w-3xl">
            AI-Powered Productivity for Modern Teams
          </p>
          <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/auth/signup"
                className="flex w-full items-center justify-center rounded-md border border-transparent bg-black px-8 py-3 text-base font-medium text-white hover:bg-gray-800 md:py-4 md:px-10 md:text-lg"
              >
                Get started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-black hover:bg-gray-50 md:py-4 md:px-10 md:text-lg"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 sm:mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="pt-6">
              <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center rounded-md bg-black p-3 shadow-lg">
                      <Zap className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">Task Tracking</h3>
                  <p className="mt-5 text-base text-gray-600">
                    Leverage AI to detect your team members, auto assign tasks, and create a robust description and title, from one single input.
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-6">
              <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center rounded-md bg-black p-3 shadow-lg">
                      <Shield className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">Resource Management</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Curate your teams commonly used resources and store them in one place for easy access. Link these resources to your tasks for easy access. 
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-6">
              <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center rounded-md bg-black p-3 shadow-lg">
                      <Users className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">Email Assistant</h3>
                  <p className="mt-5 text-base text-gray-500">
                    AI-powered email assistant helps your create reusable templates for your team. Build your own templates or use our pre-built templates to enhance your team's productivity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

