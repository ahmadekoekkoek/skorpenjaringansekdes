"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCandidateByName } from "@/lib/supabase"

interface ParticipantLoginProps {
  onLogin: (candidate: any) => void
  onClose: () => void
  candidateNames: string[]
}

export function ParticipantLogin({ onLogin, onClose, candidateNames }: ParticipantLoginProps) {
  const [selectedName, setSelectedName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!selectedName) {
      setError("Please select your name")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const candidate = await getCandidateByName(selectedName)

      if (candidate) {
        onLogin(candidate)
      } else {
        setError("Could not find your information. Please try again.")
      }
    } catch (err) {
      console.error("Error during participant login:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Select Your Name
          </label>
          <Select value={selectedName} onValueChange={setSelectedName}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your name" />
            </SelectTrigger>
            <SelectContent>
              {candidateNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleLogin} disabled={isLoading}>
            {isLoading ? "Loading..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}
