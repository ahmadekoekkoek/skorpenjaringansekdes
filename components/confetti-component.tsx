"use client"

import { useEffect } from "react"
import { triggerConfetti } from "@/lib/confetti"

export default function ConfettiComponent() {
  useEffect(() => {
    // Trigger confetti when component mounts
    triggerConfetti()

    // Set up interval to trigger confetti every 10 seconds
    const interval = setInterval(() => {
      triggerConfetti()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return null // This component doesn't render anything
}
