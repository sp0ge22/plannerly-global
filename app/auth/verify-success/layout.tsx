// app/auth/verify-success/layout.tsx
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"
import { ScrollToTop } from "@/components/ScrollToTop"
import "@/app/globals.css" // or the correct relative path to your global CSS

export const metadata: Metadata = {
  title: "Verify Success - Plannerly",
  description: "You have successfully verified your email!",
}

export default function VerifySuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ScrollToTop />
        {/* Notice we are NOT rendering <HeaderWrapper /> here */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
