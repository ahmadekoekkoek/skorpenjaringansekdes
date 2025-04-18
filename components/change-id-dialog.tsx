"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChangeIdDialogProps {
  isOpen: boolean
  onClose: () => void
  candidate: any
  onConfirm: (oldId: number, newId: number) => void
}

export function ChangeIdDialog({ isOpen, onClose, candidate, onConfirm }: ChangeIdDialogProps) {
  const [newId, setNewId] = useState(candidate?.id || "")
  const [error, setError] = useState("")

  useEffect(() => {
    if (candidate) {
      setNewId(candidate.id)
      setError("")
    }
  }, [candidate])

  const handleSubmit = () => {
    const idValue = Number.parseInt(newId.toString(), 10)

    if (isNaN(idValue) || idValue < 1 || idValue > 999) {
      setError("ID must be a number between 1 and 999")
      return
    }

    onConfirm(candidate.id, idValue)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Drawing Number</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p>
            Changing the ID for <span className="font-semibold">{candidate?.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">This will update the Drawing Number shown in the frontend.</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">New ID (Drawing Number):</label>
            <Input
              type="number"
              min="1"
              max="999"
              value={newId}
              onChange={(e) => {
                setNewId(e.target.value)
                setError("")
              }}
              className="w-full"
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Update</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
