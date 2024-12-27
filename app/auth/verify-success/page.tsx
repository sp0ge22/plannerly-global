'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Icons } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'

export default function VerifySuccess() {
  useEffect(() => {
    // Trigger confetti when the component mounts
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    // Cleanup function
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Icons.logo className="h-12 w-12 text-primary" />
            <CardTitle className="text-3xl font-bold">Plannerly</CardTitle>
          </div>
          <div className="text-2xl font-semibold text-green-600">
            🎉 Email Verified! 🎉
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your email has been successfully verified. You can now log in to your account and start using Plannerly.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/" className="w-full">
            <Button className="w-full" size="lg">
              Log In
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            You can close this tab and return to the Plannerly app.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
} 