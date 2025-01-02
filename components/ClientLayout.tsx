'use client'

import { HeaderWrapper } from "@/components/Header/HeaderWrapper"
import { usePathname } from 'next/navigation'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth/')

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && <HeaderWrapper />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
} 