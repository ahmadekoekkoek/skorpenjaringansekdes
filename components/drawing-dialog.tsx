"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface DrawingDialogProps {
  isOpen: boolean
  onClose: () => void
  candidate: any
  usedNumbers: number[]
  onDrawingComplete: (candidateId: number, newId: number) => void
}

export function DrawingDialog({ isOpen, onClose, candidate, usedNumbers, onDrawingComplete }: DrawingDialogProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentNumber, setCurrentNumber] = useState(0)
  const [finalNumber, setFinalNumber] = useState<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const availableNumbers = useRef<number[]>([])

  // Generate available numbers (1-999) excluding already used ones
  useEffect(() => {
    if (isOpen) {
      const numbers = Array.from({ length: 999 }, (_, i) => i + 1).filter((num) => !usedNumbers.includes(num))
      availableNumbers.current = numbers
      setFinalNumber(null)
      setIsDrawing(false)
    }
  }, [isOpen, usedNumbers])

  // Start the drawing animation
  const startDrawing = () => {
    if (isDrawing || finalNumber !== null) return

    setIsDrawing(true)

    // Shuffle the available numbers
    const shuffled = [...availableNumbers.current].sort(() => Math.random() - 0.5)

    // Start the animation
    let index = 0
    intervalRef.current = setInterval(() => {
      setCurrentNumber(shuffled[index % shuffled.length])
      index++
    }, 50) // Fast animation
  }

  // Stop the drawing and select a number
  const stopDrawing = async () => {
    if (!isDrawing || !intervalRef.current) return

    clearInterval(intervalRef.current)
    setIsDrawing(false)

    // Select a random number from available numbers
    const randomIndex = Math.floor(Math.random() * availableNumbers.current.length)
    const selectedNumber = availableNumbers.current[randomIndex]

    setFinalNumber(selectedNumber)

    // Call the callback with the result
    onDrawingComplete(candidate.id, selectedNumber)
  }

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Drawing Number</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center font-medium">{candidate?.name}, please press STOP to get your drawing number</p>

          <Card className="p-8 flex justify-center items-center bg-slate-50">
            <div className="text-5xl font-bold tabular-nums text-indigo-700">
              {finalNumber !== null
                ? `${finalNumber.toString().padStart(3, "0")}`
                : isDrawing
                  ? `${currentNumber.toString().padStart(3, "0")}`
                  : "---"}
            </div>
          </Card>

          <div className="flex justify-center space-x-4 pt-2">
            {!finalNumber && !isDrawing && (
              <Button onClick={startDrawing} className="bg-green-600 hover:bg-green-700 text-white" size="lg">
                START
              </Button>
            )}

            {isDrawing && (
              <Button onClick={stopDrawing} className="bg-red-600 hover:bg-red-700 text-white" size="lg">
                STOP
              </Button>
            )}

            {finalNumber !== null && (
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                DONE
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
