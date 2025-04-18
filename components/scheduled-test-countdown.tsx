"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarClock } from "lucide-react"

interface ScheduledTestCountdownProps {
  scheduledDate: string
}

export function ScheduledTestCountdown({ scheduledDate }: ScheduledTestCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const scheduled = new Date(scheduledDate)
      const difference = scheduled.getTime() - now.getTime()

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [scheduledDate])

  const formatTime = (value: number) => value.toString().padStart(2, "0")

  return (
    <Card className="bg-blue-50 border-blue-200 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center mb-2">
          <CalendarClock className="text-blue-600 mr-2" size={20} />
          <h3 className="text-lg font-bold text-blue-800">Test Scheduled</h3>
        </div>
        <p className="mb-3">
          The test is scheduled to begin on <span className="font-semibold">April 19, 2025 at 07:30 AM</span>
        </p>
        <div className="bg-white rounded-md p-3 border border-blue-200">
          <p className="text-sm font-medium mb-2 text-blue-700">Time until test begins:</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-blue-100 rounded p-2">
              <div className="text-2xl font-bold text-blue-800">{formatTime(timeLeft.days)}</div>
              <div className="text-xs text-blue-600">Days</div>
            </div>
            <div className="bg-blue-100 rounded p-2">
              <div className="text-2xl font-bold text-blue-800">{formatTime(timeLeft.hours)}</div>
              <div className="text-xs text-blue-600">Hours</div>
            </div>
            <div className="bg-blue-100 rounded p-2">
              <div className="text-2xl font-bold text-blue-800">{formatTime(timeLeft.minutes)}</div>
              <div className="text-xs text-blue-600">Minutes</div>
            </div>
            <div className="bg-blue-100 rounded p-2">
              <div className="text-2xl font-bold text-blue-800">{formatTime(timeLeft.seconds)}</div>
              <div className="text-xs text-blue-600">Seconds</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
