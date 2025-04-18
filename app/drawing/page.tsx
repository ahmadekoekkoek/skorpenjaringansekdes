"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ParticipantLogin } from "@/components/participant-login"
import { DrawingDialog } from "@/components/drawing-dialog"
import { getCandidates, getAppStatus, updateCandidateId } from "@/lib/supabase"
import { AlertTriangle } from "lucide-react"

// Format drawing number to always be 3 digits
function formatDrawingNumber(id: number): string {
  if (!id || id <= 0) return "-"
  return `${id.toString().padStart(3, "0")}`
}

export default function DrawingPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [appStatus, setAppStatus] = useState<any>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showDrawingDialog, setShowDrawingDialog] = useState(false)
  const [currentCandidate, setCurrentCandidate] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data on initial render
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candidatesData, statusData] = await Promise.all([getCandidates(), getAppStatus()])
        setCandidates(candidatesData)
        setAppStatus(statusData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle participant login
  const handleParticipantLogin = (candidate: any) => {
    setCurrentCandidate(candidate)
    setShowLoginDialog(false)

    // If the candidate already has a drawing number, don't show the drawing dialog
    if (candidate.id > 0) {
      toast({
        title: "Already Drawn",
        description: `You have already drawn number ${formatDrawingNumber(candidate.id)}`,
      })
    } else {
      setShowDrawingDialog(true)
    }
  }

  // Handle drawing completion
  const handleDrawingComplete = async (candidateId: number, newId: number) => {
    try {
      const success = await updateCandidateId(candidateId, newId)

      if (success) {
        toast({
          title: "Drawing Complete",
          description: `You have drawn number ${formatDrawingNumber(newId)}`,
        })

        // Update the current candidate
        setCurrentCandidate({
          ...currentCandidate,
          id: newId,
        })

        // Refresh the candidates list
        const updatedCandidates = await getCandidates()
        setCandidates(updatedCandidates)
      } else {
        toast({
          title: "Error",
          description: "Failed to update drawing number",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating drawing number:", error)
      toast({
        title: "Error",
        description: "An error occurred while updating your drawing number",
        variant: "destructive",
      })
    }
  }

  // Get used drawing numbers
  const getUsedDrawingNumbers = () => {
    return candidates.filter((c) => c.id > 0).map((c) => c.id)
  }

  // Check if drawing is allowed
  const isDrawingAllowed = appStatus?.status === "drawing"

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800">Sekdes 2025 - Drawing Panel</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Drawing Number Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : !isDrawingAllowed ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start">
                <AlertTriangle className="text-amber-500 mr-2 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-amber-800">Drawing is not currently active</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Please wait for the administrator to activate the drawing phase.
                  </p>
                </div>
              </div>
            ) : currentCandidate ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="font-medium text-green-800">
                    Welcome, <span className="font-bold">{currentCandidate.name}</span>
                  </p>
                  <p className="mt-2">
                    Your drawing number:{" "}
                    <span className="text-xl font-bold text-indigo-600">
                      {formatDrawingNumber(currentCandidate.id)}
                    </span>
                  </p>
                  {currentCandidate.id <= 0 && (
                    <Button
                      onClick={() => setShowDrawingDialog(true)}
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                    >
                      Draw Your Number
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentCandidate(null)
                    setShowLoginDialog(false)
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <h2 className="text-lg font-medium mb-4">Please login to draw your number</h2>
                <Button onClick={() => setShowLoginDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  Participant Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Drawing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Drawing Number</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.name} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{candidate.name}</td>
                      <td className="p-3 text-indigo-600 font-semibold">{formatDrawingNumber(candidate.id)}</td>
                      <td className="p-3">
                        {candidate.id > 0 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Participant Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participant Login</DialogTitle>
          </DialogHeader>
          <ParticipantLogin
            onLogin={handleParticipantLogin}
            onClose={() => setShowLoginDialog(false)}
            candidateNames={candidates.map((c) => c.name)}
          />
        </DialogContent>
      </Dialog>

      {/* Drawing Dialog */}
      {currentCandidate && (
        <DrawingDialog
          isOpen={showDrawingDialog}
          onClose={() => setShowDrawingDialog(false)}
          candidate={currentCandidate}
          usedNumbers={getUsedDrawingNumbers()}
          onDrawingComplete={handleDrawingComplete}
        />
      )}

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
