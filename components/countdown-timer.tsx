"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface CountdownTimerProps {
  endTime: string
  onTimeUp?: () => void
}

export function CountdownTimer({ endTime, onTimeUp }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const end = new Date(endTime)
      const difference = end.getTime() - now.getTime()

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        if (onTimeUp) onTimeUp()
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [endTime, onTimeUp])

  const formatTime = (value: number) => value.toString().padStart(2, "0")

  return (
    <Card className={isExpired ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
      <CardContent className="p-4 text-center">
        <p className="text-sm font-medium mb-2">{isExpired ? "Time is Over" : "Test is Underway"}</p>
        <div
          className={`text-2xl font-bold tabular-nums ${
            !isExpired && timeLeft.hours === 0 && timeLeft.minutes < 10 ? "animate-pulse text-red-600" : ""
          }`}
        >
          {isExpired ? (
            <span className="text-red-600">00:00:00</span>
          ) : (
            <span className={timeLeft.hours === 0 && timeLeft.minutes < 10 ? "text-red-600" : "text-blue-700"}>
              {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </span>
          )}
        </div>
        {!isExpired && timeLeft.hours === 0 && timeLeft.minutes < 10 && (
          <p className="text-sm text-red-600 mt-1 animate-pulse font-medium">Less than 10 minutes remaining!</p>
        )}
      </CardContent>
    </Card>
  )
}
