"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import type { Creator } from "@/lib/types/database"

interface CreateBatchDialogProps {
  workspaceId: string
  creators: Creator[]
  onBatchCreated: () => void
  userRole?: string
  currentUserId?: string
}

export function CreateBatchDialog({ workspaceId, creators, onBatchCreated, userRole, currentUserId }: CreateBatchDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])
  
  // If user is a creator, automatically assign to their creator profile
  const isCreator = userRole === "creator"
  const userCreator = isCreator ? creators.find(c => c.user_id === currentUserId) : null

  const toggleCreator = (creatorId: string) => {
    setSelectedCreators((prev) =>
      prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId],
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Please enter a batch name")
      return
    }

    setIsLoading(true)
    try {
      // Create batch
      const { data: newBatch, error: batchError } = await supabase
        .from("batches")
        .insert({
          workspace_id: workspaceId,
          name,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .select()
        .single()

      if (batchError) throw batchError

      // Add creators to batch
      const creatorsToAdd = isCreator && userCreator ? [userCreator.id] : selectedCreators
      
      for (const creatorId of creatorsToAdd) {
        await supabase.from("batch_creators").insert({
          batch_id: newBatch.id,
          creator_id: creatorId,
        })
      }

      resetForm()
      setOpen(false)
      onBatchCreated()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setStartDate("")
    setEndDate("")
    setSelectedCreators([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="min-w-0">
          <Plus className="size-4 mr-2" />
          <span className="hidden sm:inline">Create </span>Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Create New Batch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Batch Name</Label>
            <Input placeholder="January 2026 Content" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {!isCreator && (
            <div className="space-y-2">
              <Label>Creators</Label>
              <div className="space-y-2">
                {creators.map((creator) => (
                  <div key={creator.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={creator.id}
                      checked={selectedCreators.includes(creator.id)}
                      onCheckedChange={() => toggleCreator(creator.id)}
                    />
                    <label htmlFor={creator.id} className="text-sm cursor-pointer">
                      {creator.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isCreator && userCreator && (
            <div className="space-y-2">
              <Label>Creator</Label>
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                This batch will be assigned to: <strong>
                  {userCreator.workspace_members?.[0]?.user_profiles?.first_name && userCreator.workspace_members?.[0]?.user_profiles?.last_name
                    ? `${userCreator.workspace_members[0].user_profiles.first_name} ${userCreator.workspace_members[0].user_profiles.last_name}`
                    : userCreator.brand_name || userCreator.name}
                </strong>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Creating..." : "Create Batch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
