"use client"

import { useState, useEffect, useRef, type KeyboardEvent } from "react"
import { Award, Clock, Menu, X, RefreshCw, AlertTriangle, Trophy, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { CountdownTimer } from "@/components/countdown-timer"
import { ScheduledTestCountdown } from "@/components/scheduled-test-countdown"
import { ChangeIdDialog } from "@/components/change-id-dialog"
import {
  supabase,
  getCandidates,
  getAppStatus,
  updateCandidate,
  updateAppStatus,
  insertCandidates,
  updateNextStageScore,
  updateCandidateId,
  type Candidate,
  type AppStatus,
} from "@/lib/supabase"
import { triggerConfetti } from "@/lib/confetti"
import dynamic from "next/dynamic"

// Import canvas-confetti dynamically to avoid SSR issues
const ConfettiComponent = dynamic(() => import("@/components/confetti-component"), { ssr: false })

// Simulated backend service
const ScoreCalculationService = {
  // Education values mapping
  educationValues: {
    SLTA: 5,
    D1: 8,
    D2: 11,
    D3: 14,
    S1: 17,
    S2: 20,
    S3: 20,
  },

  // Experience values mapping
  experienceValues: {
    "Kepala Desa": 20,
    BPD: 20,
    Sekdes: 18,
    Kasi: 15,
    Kaur: 15,
    Kasun: 12,
    "No Experience": 0,
  },

  calculateTotalScore(education, experience, testScore) {
    const educationValue = this.educationValues[education] || 0
    const experienceValue = this.experienceValues[experience] || 0
    const testScoreValue = testScore === "" || testScore === null ? 0 : Number.parseFloat(testScore) || 0

    return educationValue + experienceValue + 0.6 * testScoreValue
  },

  getRankings(data) {
    return [...data]
      .sort((a, b) => b.totalResult - a.totalResult)
      .map((person, index) => ({
        ...person,
        rank: index + 1,
      }))
  },

  getNextStageRankings(tiedCandidates) {
    return [...tiedCandidates]
      .sort((a, b) => {
        const scoreA = a.next_stage_score ? Number.parseFloat(a.next_stage_score.toString()) : 0
        const scoreB = b.next_stage_score ? Number.parseFloat(b.next_stage_score.toString()) : 0
        return scoreB - scoreA
      })
      .map((person, index) => ({
        ...person,
        nextStageRank: index + 1,
      }))
  },
}

// Login Component
function AdminLogin({ onLogin, onClose }) {
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")

  const handleLogin = () => {
    if (accessCode === "1904") {
      // Changed from 19042025 to 1904
      onLogin(true)
    } else {
      setError("Invalid access code")
      setTimeout(() => setError(""), 3000)
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Access Code
          </label>
          <Input
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter access code"
            className="w-full"
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleLogin}>Login</Button>
        </div>
      </div>
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }) {
  const getStatusDetails = (status) => {
    switch (status) {
      case "not_started":
        return { label: "Not Started Yet", color: "bg-gray-100 text-gray-800 border-gray-300" }
      case "ongoing":
        return { label: "Ongoing", color: "bg-green-100 text-green-800 border-green-300" }
      case "under_correction":
        return { label: "Under Correction", color: "bg-amber-100 text-amber-800 border-amber-300" }
      case "finished":
        return { label: "Finished", color: "bg-blue-100 text-blue-800 border-blue-300" }
      case "next_stage":
        return { label: "Next Stage", color: "bg-purple-100 text-purple-800 border-purple-300" }
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800 border-gray-300" }
    }
  }

  const { label, color } = getStatusDetails(status)

  return (
    <Badge variant="outline" className={`${color}`}>
      {label}
    </Badge>
  )
}

// Format drawing number to always be 3 digits
function formatDrawingNumber(id: number): string {
  if (!id || id <= 0) return "-"
  return `${id.toString().padStart(3, "0")}`
}

// Top Candidate Card Component
function TopCandidateCard({ candidate, rank, isUpdated, showMedal, isTied, isNextStage }) {
  const getBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return "bg-amber-100 border-amber-500 text-amber-800"
      case 2:
        return "bg-slate-100 border-slate-400 text-slate-800"
      case 3:
        return "bg-orange-100 border-orange-500 text-orange-800"
      default:
        return "bg-gray-100"
    }
  }

  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return "bg-amber-500 text-white"
      case 2:
        return "bg-slate-400 text-white"
      case 3:
        return "bg-orange-500 text-white"
      default:
        return "bg-gray-400"
    }
  }

  // Ensure totalResult is a number and has toFixed method
  const totalResult = typeof candidate.totalResult === "number" ? candidate.totalResult : 0
  const nextStageScore = candidate.next_stage_score ? Number.parseFloat(candidate.next_stage_score.toString()) : 0
  const drawingNumber = formatDrawingNumber(candidate.id)

  return (
    <Card
      className={`relative overflow-hidden ${getBadgeColor(rank)} border-2 ${rank === 1 ? "shadow-lg" : ""} 
      ${isUpdated ? "animate-pulse" : ""}`}
    >
      {rank === 1 && showMedal && !isTied && (
        <div className="absolute -right-6 -top-6 opacity-20 rotate-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-800"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg>
        </div>
      )}
      <div
        className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center font-bold ${getRankBadgeColor(rank)} z-10`}
      >
        {rank}
      </div>
      <CardHeader className={`p-4 pb-2 ${rank === 1 ? "pt-6" : ""}`}>
        <CardTitle className={`text-center ${rank === 1 ? "text-xl" : "text-lg"}`}>
          {candidate.name}
          {rank === 1 && showMedal && !isTied && (
            <div className="flex justify-center mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-amber-500"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
            </div>
          )}
          {rank === 2 && (
            <div className="flex justify-center mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-500"
              >
                <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.11"></path>
                <circle cx="12" cy="8" r="7"></circle>
              </svg>
            </div>
          )}
          {rank === 3 && (
            <div className="flex justify-center mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-500"
              >
                <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.11"></path>
                <circle cx="12" cy="8" r="7"></circle>
              </svg>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-1 text-sm">
          <div className="font-medium">Education:</div>
          <div>{candidate.education}</div>

          <div className="font-medium">Experience:</div>
          <div>{candidate.experience}</div>

          <div className="font-medium">Test Score:</div>
          <div>{candidate.test_score || "0"}</div>

          {isNextStage && (
            <>
              <div className="font-medium text-purple-700">Next Stage:</div>
              <div className="font-semibold text-purple-700">{candidate.next_stage_score || "0"}</div>
            </>
          )}

          <div className="font-medium">Drawing No:</div>
          <div className="text-indigo-600 font-semibold">{drawingNumber}</div>
        </div>
        <div className="text-center mt-2">
          <span className={`font-bold ${rank === 1 ? "text-2xl text-amber-700" : "text-xl"}`}>
            {isNextStage && candidate.next_stage_score ? nextStageScore.toFixed(1) : totalResult.toFixed(1)}
          </span>
        </div>
      </CardContent>
      {isUpdated && (
        <div className="absolute top-0 right-0 m-1">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1" /> Updated
          </Badge>
        </div>
      )}
    </Card>
  )
}

// Winner Announcement Component
function WinnerAnnouncement({ winner, isTied, tiedCandidates, isNextStage }) {
  if (isNextStage && tiedCandidates.length > 0) {
    const sortedCandidates = ScoreCalculationService.getNextStageRankings(tiedCandidates)
    const nextStageWinner = sortedCandidates[0]

    if (nextStageWinner) {
      return (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Trophy className="text-amber-500 mr-2" size={24} />
              <h3 className="text-xl font-bold text-green-800">Next Stage Winner Announced!</h3>
            </div>
            <p className="text-lg mb-2">
              Congratulations to <span className="font-bold text-amber-700">{nextStageWinner.name}</span> for winning
              the Next Stage with{" "}
              <span className="font-bold">
                {nextStageWinner.next_stage_score ? Number(nextStageWinner.next_stage_score).toFixed(1) : "0"}
              </span>{" "}
              points!
            </p>
            <p className="text-sm text-green-700">
              The selection process has been completed successfully after the next stage.
            </p>
          </CardContent>
        </Card>
      )
    }
  }

  if (isTied) {
    return (
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="text-blue-500 mr-2" size={20} />
            <h3 className="text-lg font-bold text-blue-800">Tied Score!</h3>
          </div>
          <p className="mb-2">
            There is a tie for first place. The following candidates will advance to the next stage:
          </p>
          <ul className="list-disc pl-5 mb-2">
            {tiedCandidates.map((candidate) => (
              <li key={candidate.id} className="font-medium">
                {candidate.name} - {candidate.totalResult.toFixed(1)} points (Drawing No:{" "}
                {formatDrawingNumber(candidate.id)})
              </li>
            ))}
          </ul>
          <p className="text-sm text-blue-700">
            The final winner will be determined based on the test score in the next stage.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (winner) {
    return (
      <Card className="mb-6 bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            <Trophy className="text-amber-500 mr-2" size={24} />
            <h3 className="text-xl font-bold text-green-800">Winner Announced!</h3>
          </div>
          <p className="text-lg mb-2">
            Congratulations to <span className="font-bold text-amber-700">{winner.name}</span> for winning the Sekdes
            2025 selection with <span className="font-bold">{winner.totalResult.toFixed(1)}</span> points!
          </p>
          <p className="text-sm text-green-700">The selection process has been completed successfully.</p>
        </CardContent>
      </Card>
    )
  }

  return null
}

// Next Stage Table Component
function NextStageTable({ tiedCandidates, isAdmin = false }) {
  // Sort candidates by next stage score
  const sortedCandidates = ScoreCalculationService.getNextStageRankings(tiedCandidates)

  // State for input values
  const [inputValues, setInputValues] = useState<Record<number, string>>({})

  // Handle input change
  const handleInputChange = (candidateId: number, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [candidateId]: value,
    }))
  }

  // Handle input blur or Enter key press
  const handleInputSubmit = (candidateId: number) => {
    const value = inputValues[candidateId]
    if (value !== undefined) {
      const numValue = value === "" ? null : Math.min(100, Math.max(0, Number.parseFloat(value) || 0))
      updateNextStageScore(candidateId, numValue ? numValue.toString() : null)
    }
  }

  // Handle key down event
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, candidateId: number) => {
    if (e.key === "Enter") {
      handleInputSubmit(candidateId)
    }
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center">
        <Award className="mr-2" size={20} />
        Next Stage Test Results
      </h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" id="next-stage-table">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Rank</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Drawing No</th>
                  <th className="text-left p-3 font-medium">Test Score</th>
                  {isAdmin && <th className="text-left p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.map((candidate, index) => {
                  const testScore = candidate.next_stage_score
                    ? Number.parseFloat(candidate.next_stage_score.toString())
                    : 0
                  return (
                    <tr key={candidate.id} className={`border-b hover:bg-slate-50 ${index === 0 ? "bg-amber-50" : ""}`}>
                      <td className="p-3">
                        <Badge variant={index === 0 ? "default" : "secondary"}>{index + 1}</Badge>
                      </td>
                      <td className="p-3 font-medium">
                        {candidate.name}
                        {index === 0 && (
                          <span className="ml-2 inline-flex items-center">
                            <Trophy className="w-4 h-4 text-amber-500" />
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-indigo-600 font-semibold">{formatDrawingNumber(candidate.id)}</td>
                      <td className="p-3 font-bold">{testScore.toFixed(1)}</td>
                      {isAdmin && (
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-[100px]"
                            value={
                              inputValues[candidate.id] !== undefined
                                ? inputValues[candidate.id]
                                : candidate.next_stage_score || ""
                            }
                            onChange={(e) => handleInputChange(candidate.id, e.target.value)}
                            onBlur={() => handleInputSubmit(candidate.id)}
                            onKeyDown={(e) => handleKeyDown(e, candidate.id)}
                            placeholder="0-100"
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Application Component
export default function TotalResultScoreApp() {
  // Fixed names as requested
  const fixedNames = ["Yantika", "Agung", "Khomsa", "Intan", "Aldo", "Firman", "Siti", "Agus", "Amri", "Martha"]

  // Initial data for 10 rows with fixed names and blank test scores
  const getInitialData = () => {
    return Array(10)
      .fill()
      .map((_, index) => ({
        id: index + 1, // Start with index + 1 for initial IDs
        name: fixedNames[index],
        education: "SLTA",
        experience: "No Experience",
        test_score: null,
        totalResult: 5, // Default calculation with just SLTA and No Experience
        last_updated: new Date().toISOString(),
      }))
  }

  const [data, setData] = useState<Candidate[]>([])
  const [rankedData, setRankedData] = useState<(Candidate & { rank: number })[]>([])
  const [activeTab, setActiveTab] = useState("livestream")
  const [updateTimestamp, setUpdateTimestamp] = useState(new Date())
  const [isLive, setIsLive] = useState(true)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showFormulaInfo, setShowFormulaInfo] = useState(false)
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<number, boolean>>({})
  const [hasNewUpdates, setHasNewUpdates] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [winner, setWinner] = useState<(Candidate & { rank: number }) | null>(null)
  const [isTied, setIsTied] = useState(false)
  const [tiedCandidates, setTiedCandidates] = useState<(Candidate & { rank: number })[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showChangeIdDialog, setShowChangeIdDialog] = useState(false)

  // State for input values
  const [testScoreInputs, setTestScoreInputs] = useState<Record<number, string>>({})
  const [drawingNumberInputs, setDrawingNumberInputs] = useState<Record<number, string>>({})

  // Track previous rankings for change detection
  const prevRankingsRef = useRef<Record<number, number>>({})

  // Set up real-time subscription
  useEffect(() => {
    // Subscribe to changes in the candidates table
    const candidatesSubscription = supabase
      .channel("candidates-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "candidates",
        },
        (payload) => {
          // Refresh data when changes occur
          fetchData()

          // Mark updated candidate
          if (payload.eventType === "UPDATE") {
            const updatedId = payload.new.id
            setRecentlyUpdated((prev) => ({
              ...prev,
              [updatedId]: true,
            }))
            setHasNewUpdates(true)
          }
        },
      )
      .subscribe()

    // Subscribe to changes in the app_status table
    const statusSubscription = supabase
      .channel("status-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_status",
        },
        () => {
          fetchAppStatus()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(candidatesSubscription)
      supabase.removeChannel(statusSubscription)
    }
  }, [])

  // Fetch data from Supabase
  const fetchData = async () => {
    const candidates = await getCandidates()
    if (candidates.length > 0) {
      setData(candidates)
    }
    setDataLoaded(true)
  }

  // Fetch app status from Supabase
  const fetchAppStatus = async () => {
    const status = await getAppStatus()
    if (status) {
      setAppStatus(status)
    }
  }

  // Initialize data if empty
  const initializeData = async () => {
    setIsInitializing(true)
    try {
      const initialData = getInitialData()
      const success = await insertCandidates(initialData)
      if (success) {
        toast({
          title: "Data Initialized",
          description: "Initial candidate data has been created",
          duration: 3000,
        })
        await fetchData()
      } else {
        toast({
          title: "Initialization Failed",
          description: "Failed to create initial data",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Error initializing data:", error)
      toast({
        title: "Initialization Error",
        description: "An error occurred while initializing data",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsInitializing(false)
    }
  }

  // Load data on initial render
  useEffect(() => {
    fetchData()
    fetchAppStatus()
  }, [])

  // Handle test score input change
  const handleTestScoreChange = (id: number, value: string) => {
    setTestScoreInputs((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  // Handle test score input submit (on blur or Enter key)
  const handleTestScoreSubmit = async (id: number) => {
    const value = testScoreInputs[id]
    if (value === undefined) return

    const numValue = value === "" ? null : Math.min(100, Math.max(0, Number.parseFloat(value) || 0))
    await updateData(id, "test_score", numValue ? numValue.toString() : null)

    // Clear the input value from state after submission
    setTestScoreInputs((prev) => {
      const newState = { ...prev }
      delete newState[id]
      return newState
    })
  }

  // Handle key down event for test score input
  const handleTestScoreKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: number) => {
    if (e.key === "Enter") {
      handleTestScoreSubmit(id)
    }
  }

  // Handle drawing number input change
  const handleDrawingNumberChange = (id: number, value: string) => {
    setDrawingNumberInputs((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  // Handle drawing number input submit (on blur or Enter key)
  const handleDrawingNumberSubmit = async (id: number) => {
    const value = drawingNumberInputs[id]
    if (value === undefined) return

    const numValue = Math.min(999, Math.max(1, Number.parseInt(value) || 1))
    await handleChangeId(id, numValue)

    // Clear the input value from state after submission
    setDrawingNumberInputs((prev) => {
      const newState = { ...prev }
      delete newState[id]
      return newState
    })
  }

  // Handle key down event for drawing number input
  const handleDrawingNumberKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: number) => {
    if (e.key === "Enter") {
      handleDrawingNumberSubmit(id)
    }
  }

  // Update row data and recalculate total
  const updateData = async (id, field, value) => {
    const candidateToUpdate = data.find((c) => c.id === id)
    if (!candidateToUpdate) return

    const updatedCandidate = {
      ...candidateToUpdate,
      [field]: value,
      last_updated: new Date().toISOString(),
    }

    // Recalculate total result
    updatedCandidate.totalResult = ScoreCalculationService.calculateTotalScore(
      updatedCandidate.education,
      updatedCandidate.experience,
      updatedCandidate.test_score,
    )

    // Update in Supabase
    const success = await updateCandidate(updatedCandidate)

    if (success) {
      // Update local state
      setData((prevData) => prevData.map((row) => (row.id === id ? updatedCandidate : row)))

      // Mark this ID as recently updated
      setRecentlyUpdated((prev) => ({
        ...prev,
        [id]: true,
      }))

      // Set flag for new updates
      setHasNewUpdates(true)
      setUpdateTimestamp(new Date())

      // Show toast notification
      toast({
        title: "Data Updated",
        description: `Updated ${field} for ${candidateToUpdate.name}`,
        duration: 3000,
      })
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update data",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Handle changing candidate ID (drawing number)
  const handleChangeId = async (oldId: number, newId: number) => {
    if (oldId === newId) return

    const success = await updateCandidateId(oldId, newId)

    if (success) {
      toast({
        title: "Drawing Number Updated",
        description: `Successfully updated drawing number`,
        duration: 3000,
      })

      // Refresh data to get the updated IDs
      await fetchData()
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update drawing number. It may already be in use.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Update app status
  const updateStatus = async (status, duration = 120) => {
    const now = new Date()
    let endTime = null

    if (status === "ongoing" || status === "next_stage") {
      // Set end time based on status
      const end = new Date(now)

      if (status === "next_stage") {
        // If we're setting next_stage with a 1-hour duration
        if (duration === 60) {
          end.setMinutes(end.getMinutes() + 60) // 1 hour for next stage
        } else {
          end.setMinutes(end.getMinutes() + duration) // Default duration
        }
      } else {
        end.setMinutes(end.getMinutes() + duration) // Default duration for ongoing
      }

      endTime = end.toISOString()
    }

    const statusData = {
      status,
      start_time: status === "ongoing" || status === "next_stage" ? now.toISOString() : null,
      end_time: endTime,
    }

    const success = await updateAppStatus(statusData)

    if (success) {
      setAppStatus((prev) => (prev ? { ...prev, ...statusData } : null))

      // If status is set to finished, check for winner or tie
      if (status === "finished" && rankedData.length > 0) {
        checkWinnerOrTie()
      }

      toast({
        title: "Status Updated",
        description: `Status changed to ${status.replace("_", " ")}`,
        duration: 3000,
      })
    } else {
      toast({
        title: "Status Update Failed",
        description: "Failed to update status",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Move to next stage
  const moveToNextStage = async () => {
    const success = await updateAppStatus({
      status: "next_stage",
      has_tie: true,
    })

    if (success) {
      setAppStatus((prev) => (prev ? { ...prev, status: "next_stage", has_tie: true } : null))

      toast({
        title: "Next Stage Started",
        description: "The competition has moved to the next stage",
        duration: 3000,
      })

      setShowConfetti(false)
    } else {
      toast({
        title: "Status Update Failed",
        description: "Failed to move to next stage",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  // Check if there's a winner or a tie
  const checkWinnerOrTie = () => {
    if (rankedData.length === 0) return

    const firstPlace = rankedData[0]
    const tiedForFirst = rankedData.filter(
      (candidate) => Math.abs(candidate.totalResult - firstPlace.totalResult) < 0.001,
    )

    if (tiedForFirst.length > 1) {
      // There's a tie
      setIsTied(true)
      setTiedCandidates(tiedForFirst)
      setWinner(null)
      setShowConfetti(false)

      // Update has_tie in the database
      updateAppStatus({ has_tie: true }).catch(console.error)
    } else {
      // There's a clear winner
      setIsTied(false)
      setTiedCandidates([])
      setWinner(firstPlace)

      // Update has_tie in the database
      updateAppStatus({ has_tie: false }).catch(console.error)

      // Play confetti immediately
      setShowConfetti(true)
      triggerConfetti()
    }
  }

  // Calculate rankings whenever data changes
  useEffect(() => {
    if (data.length > 0) {
      const sortedData = ScoreCalculationService.getRankings(data)

      // Check for rank changes
      const rankChanges = []
      sortedData.forEach((person) => {
        const prevRank = prevRankingsRef.current[person.id]
        if (prevRank && prevRank !== person.rank) {
          rankChanges.push({
            name: person.name,
            oldRank: prevRank,
            newRank: person.rank,
          })
        }
        // Update the ref with current rank
        prevRankingsRef.current[person.id] = person.rank
      })

      // Notify about rank changes
      if (rankChanges.length > 0 && isAdminLoggedIn) {
        rankChanges.forEach((change) => {
          const direction = change.newRank < change.oldRank ? "up" : "down"
          toast({
            title: `Rank Change: ${change.name}`,
            description: `Moved ${direction} from rank ${change.oldRank} to ${change.newRank}`,
            duration: 4000,
          })
        })
      }

      setRankedData(sortedData)

      // Check for winner or tie if status is finished
      if (appStatus?.status === "finished") {
        checkWinnerOrTie()
      }
    }
  }, [data, isAdminLoggedIn, appStatus])

  // Clear recently updated flags after some time
  useEffect(() => {
    if (Object.keys(recentlyUpdated).length > 0) {
      const timer = setTimeout(() => {
        setRecentlyUpdated({})
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [recentlyUpdated])

  // Simulated live update notification
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive) {
        setUpdateTimestamp(new Date())
      }
    }, 60000) // Update timestamp every minute to simulate "live" status

    return () => clearInterval(interval)
  }, [isLive])

  // Handle admin login
  const handleAdminLogin = (success) => {
    if (success) {
      setIsAdminLoggedIn(true)
      setActiveTab("admin")
      setShowAdminLogin(false)
    }
  }

  // Handle tab change with authorization check
  const handleTabChange = (tab) => {
    if (tab === "admin" && !isAdminLoggedIn) {
      setShowAdminLogin(true)
    } else {
      setActiveTab(tab)
      setShowMobileMenu(false)

      // Reset new updates flag when switching to livestream
      if (tab === "livestream" && hasNewUpdates) {
        setHasNewUpdates(false)
      }
    }
  }

  // Check if a candidate was recently updated
  const wasRecentlyUpdated = (id) => {
    return recentlyUpdated[id] === true
  }

  // Handle time up event
  const handleTimeUp = () => {
    if (appStatus?.status === "ongoing") {
      toast({
        title: "Time is up!",
        description: "The test period has ended",
        duration: 5000,
      })

      // Automatically change status to under_correction if admin is logged in
      if (isAdminLoggedIn) {
        updateStatus("under_correction")
      }
    }
  }

  // Open change ID dialog
  const openChangeIdDialog = (candidate) => {
    setSelectedCandidate(candidate)
    setShowChangeIdDialog(true)
  }

  // Prevent right-click
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [])

  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-lg">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster />
      {showConfetti && <ConfettiComponent />}

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Livestream Skor Penilaian Sekdes 2025</h1>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-slate-100"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            <Button
              variant={activeTab === "livestream" ? "default" : "ghost"}
              onClick={() => handleTabChange("livestream")}
              className="text-sm relative"
            >
              Livestream Results
              {activeTab !== "livestream" && hasNewUpdates && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </Button>
            <Button
              variant={activeTab === "admin" ? "default" : "ghost"}
              onClick={() => handleTabChange("admin")}
              className="text-sm"
            >
              Admin Panel
            </Button>
          </nav>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-t">
            <div className="container mx-auto px-4 py-2 space-y-2">
              <Button
                variant={activeTab === "livestream" ? "default" : "ghost"}
                onClick={() => handleTabChange("livestream")}
                className="w-full justify-start relative"
              >
                Livestream Results
                {activeTab !== "livestream" && hasNewUpdates && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </Button>
              <Button
                variant={activeTab === "admin" ? "default" : "ghost"}
                onClick={() => handleTabChange("admin")}
                className="w-full justify-start"
              >
                Admin Panel
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Admin Login Dialog */}
      <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
          </DialogHeader>
          <AdminLogin onLogin={handleAdminLogin} onClose={() => setShowAdminLogin(false)} />
        </DialogContent>
      </Dialog>

      {/* Formula Info Dialog */}
      <Dialog open={showFormulaInfo} onOpenChange={setShowFormulaInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formula Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="font-medium">Total Result = (Education + Experience) + 0.6 × Test Score</p>

            <div className="space-y-3">
              <div>
                <h3 className="font-medium mb-1">Education Values:</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {Object.entries(ScoreCalculationService.educationValues).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-1">Experience Values:</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {Object.entries(ScoreCalculationService.experienceValues).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change ID Dialog */}
      {selectedCandidate && (
        <ChangeIdDialog
          isOpen={showChangeIdDialog}
          onClose={() => setShowChangeIdDialog(false)}
          candidate={selectedCandidate}
          onConfirm={handleChangeId}
        />
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Total Result Score</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFormulaInfo(true)}
                    className="flex items-center bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    <Info className="w-4 h-4 mr-1" /> View Formula
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status and Live Indicator */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm mb-4 gap-2">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${isLive ? "bg-green-500 animate-pulse" : "bg-slate-400"}`}
                  ></div>
                  <span className="font-medium mr-2">{isLive ? "Live Results" : "Results Paused"}</span>
                  {appStatus && <StatusBadge status={appStatus.status} />}
                </div>
                <div className="text-slate-500 flex items-center">
                  <Clock size={14} className="mr-1" />
                  {updateTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Scheduled Test Countdown for Not Started Status */}
              {appStatus?.status === "not_started" && <ScheduledTestCountdown scheduledDate="2025-04-19T07:30:00" />}

              {/* Countdown Timer for Ongoing Status */}
              {(appStatus?.status === "ongoing" || appStatus?.status === "next_stage") && appStatus.end_time && (
                <div className="mt-4">
                  <CountdownTimer endTime={appStatus.end_time} onTimeUp={handleTimeUp} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* No Data Warning */}
        {data.length === 0 && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center">
              <AlertTriangle className="text-amber-500 mr-2" size={20} />
              <div>
                <p className="font-medium">No candidate data found</p>
                {isAdminLoggedIn && (
                  <div className="mt-2">
                    <Button size="sm" onClick={initializeData} disabled={isInitializing}>
                      {isInitializing ? "Initializing..." : "Initialize Data"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "livestream" && (
          <div className="space-y-6">
            {/* Winner Announcement */}
            {(appStatus?.status === "finished" || appStatus?.status === "next_stage") && (
              <WinnerAnnouncement
                winner={winner}
                isTied={isTied}
                tiedCandidates={tiedCandidates}
                isNextStage={appStatus.status === "next_stage"}
              />
            )}

            {/* Next Stage Table */}
            {appStatus?.status === "next_stage" && tiedCandidates.length > 0 && (
              <NextStageTable tiedCandidates={tiedCandidates} />
            )}

            {/* Top Three Rankings */}
            {rankedData.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Award className="mr-2" size={20} />
                  Top Rankings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rankedData.slice(0, 3).map((person) => (
                    <div
                      key={person.id}
                      className={`${person.rank === 1 ? "col-span-1 sm:col-span-2 lg:col-span-1 transform transition-transform duration-200 hover:scale-105" : ""}`}
                    >
                      <TopCandidateCard
                        candidate={person}
                        rank={person.rank}
                        isUpdated={wasRecentlyUpdated(person.id)}
                        showMedal={appStatus?.status === "finished" || appStatus?.status === "next_stage"}
                        isTied={isTied}
                        isNextStage={appStatus?.status === "next_stage"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Rankings Table */}
            {rankedData.length > 0 && (
              <div id="rankings-container">
                <h2 className="text-lg font-semibold mb-3">Complete Rankings</h2>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full" id="rankings-table">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Rank</th>
                            <th className="text-left p-3 font-medium">Name</th>
                            <th className="text-left p-3 font-medium">Education</th>
                            <th className="text-left p-3 font-medium">Experience</th>
                            <th className="text-left p-3 font-medium">Test</th>
                            {appStatus?.status === "next_stage" && (
                              <th className="text-left p-3 font-medium text-purple-700">Next Stage</th>
                            )}
                            <th className="text-left p-3 font-medium">Total</th>
                            <th className="text-left p-3 font-medium text-indigo-600">Drawing No</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankedData.map((person) => (
                            <tr
                              key={person.id}
                              className={`border-b hover:bg-slate-50 ${person.rank <= 3 ? "bg-slate-50" : ""} 
                              ${wasRecentlyUpdated(person.id) ? "bg-green-50 transition-colors duration-1000" : ""}`}
                            >
                              <td className="p-3">
                                <Badge variant={person.rank <= 3 ? "default" : "secondary"}>{person.rank}</Badge>
                              </td>
                              <td className="p-3 font-medium">
                                {person.name}
                                {wasRecentlyUpdated(person.id) && (
                                  <span className="ml-2 inline-flex items-center">
                                    <RefreshCw className="w-3 h-3 text-green-500 animate-spin" />
                                  </span>
                                )}
                              </td>
                              <td className="p-3">{person.education}</td>
                              <td className="p-3">{person.experience}</td>
                              <td className="p-3">{person.test_score || "0"}</td>
                              {appStatus?.status === "next_stage" && (
                                <td className="p-3 font-medium text-purple-700">{person.next_stage_score || "0"}</td>
                              )}
                              <td className="p-3 font-bold">{person.totalResult.toFixed(1)}</td>
                              <td className="p-3 font-semibold text-indigo-600">{formatDrawingNumber(person.id)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === "admin" && isAdminLoggedIn && (
          <div className="space-y-6">
            {/* Status Management */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Status Management</h2>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Current Status:</p>
                        <div className="mt-1">
                          {appStatus ? <StatusBadge status={appStatus.status} /> : "Loading..."}
                        </div>
                      </div>

                      {appStatus?.status === "ongoing" && appStatus.end_time && (
                        <div>
                          <p className="text-sm text-slate-500">End Time:</p>
                          <p className="font-medium">{new Date(appStatus.end_time).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Button
                        variant={appStatus?.status === "not_started" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStatus("not_started")}
                        disabled={appStatus?.status === "not_started"}
                      >
                        Not Started
                      </Button>
                      <Button
                        variant={appStatus?.status === "ongoing" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStatus("ongoing")}
                        disabled={appStatus?.status === "ongoing"}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Start (2h)
                      </Button>
                      <Button
                        variant={appStatus?.status === "under_correction" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStatus("under_correction")}
                        disabled={appStatus?.status === "under_correction"}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Under Correction
                      </Button>
                      <Button
                        variant={appStatus?.status === "finished" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStatus("finished")}
                        disabled={appStatus?.status === "finished"}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Finished
                      </Button>

                      {appStatus?.status === "next_stage" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus("next_stage", 60)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Next Stage Start (1h)
                        </Button>
                      )}
                    </div>

                    {appStatus?.status === "finished" && appStatus.has_tie && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={moveToNextStage}
                        className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                      >
                        Move to Next Stage
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Next Stage Management */}
            {appStatus?.status === "next_stage" && tiedCandidates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Next Stage Management</h2>
                <NextStageTable tiedCandidates={tiedCandidates} isAdmin={true} />
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Admin Management Panel</h2>
              <div className="flex space-x-2">
                {hasNewUpdates && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabChange("livestream")}
                    className="flex items-center text-green-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> View Updates
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsLive(!isLive)} className="flex items-center">
                  {isLive ? "Pause Updates" : "Resume Updates"}
                </Button>
                {data.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={initializeData}
                    className="flex items-center"
                    disabled={isInitializing}
                  >
                    Reset All
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" id="admin-table">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">No</th>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Education</th>
                        <th className="text-left p-3 font-medium">Experience</th>
                        <th className="text-left p-3 font-medium">Test Score</th>
                        <th className="text-left p-3 font-medium">Drawing No</th>
                        <th className="text-left p-3 font-medium">Total</th>
                        <th className="text-left p-3 font-medium">Rank</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        // Find the rank from rankedData
                        const rankedPerson = rankedData.find((p) => p.id === row.id)
                        const rank = rankedPerson ? rankedPerson.rank : "-"

                        return (
                          <tr key={row.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">{row.id || "-"}</td>
                            <td className="p-3 font-medium">{row.name}</td>
                            <td className="p-3">
                              <Select
                                value={row.education}
                                onValueChange={(value) => updateData(row.id, "education", value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(ScoreCalculationService.educationValues).map((edu) => (
                                    <SelectItem key={edu} value={edu}>
                                      {edu}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value={row.experience}
                                onValueChange={(value) => updateData(row.id, "experience", value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(ScoreCalculationService.experienceValues).map((exp) => (
                                    <SelectItem key={exp} value={exp}>
                                      {exp}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                className="w-[100px]"
                                value={
                                  testScoreInputs[row.id] !== undefined ? testScoreInputs[row.id] : row.test_score || ""
                                }
                                onChange={(e) => handleTestScoreChange(row.id, e.target.value)}
                                onBlur={() => handleTestScoreSubmit(row.id)}
                                onKeyDown={(e) => handleTestScoreKeyDown(e, row.id)}
                                placeholder="0-100"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="1"
                                max="999"
                                className="w-[100px]"
                                value={
                                  drawingNumberInputs[row.id] !== undefined ? drawingNumberInputs[row.id] : row.id || ""
                                }
                                onChange={(e) => handleDrawingNumberChange(row.id, e.target.value)}
                                onBlur={() => handleDrawingNumberSubmit(row.id)}
                                onKeyDown={(e) => handleDrawingNumberKeyDown(e, row.id)}
                                placeholder="1-999"
                              />
                            </td>
                            <td className="p-3 font-bold">{row.totalResult.toFixed(1)}</td>
                            <td className="p-3">
                              <Badge variant={rank <= 3 ? "default" : "secondary"}>{rank}</Badge>
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openChangeIdDialog(row)}
                                className="h-8 px-2"
                              >
                                Change ID
                              </Button>

                              {appStatus?.status === "next_stage" && tiedCandidates.some((c) => c.id === row.id) && (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-[100px] mt-2"
                                  value={row.next_stage_score || ""}
                                  onChange={(e) => {
                                    const value =
                                      e.target.value === ""
                                        ? null
                                        : Math.min(100, Math.max(0, Number.parseFloat(e.target.value) || 0))
                                    updateNextStageScore(row.id, value ? value.toString() : null)
                                  }}
                                  placeholder="Next Stage"
                                />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>© 2025 Sekretaris Desa Selection System</p>
          <p className="mt-1">Developed by Ahmad Eko Sampurno</p>
        </div>
      </footer>
    </div>
  )
}
