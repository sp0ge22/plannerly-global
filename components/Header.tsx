import Link from 'next/link'
import { Icons } from "@/components/ui/icons"

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-6 flex items-center justify-between border-b border-gray-200 lg:border-none">
          <div className="flex items-center space-x-2">
            <Icons.logo className="h-8 w-8 text-primary" />
            <Link href="/" className="text-3xl font-bold">
              Plannerly
            </Link>
          </div>
          <div className="ml-10 space-x-4">
            <Link
              href="/auth/login"
              className="inline-block bg-black py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-gray-800"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-block bg-white py-2 px-4 border border-black rounded-md text-base font-medium text-black hover:bg-gray-50"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}

