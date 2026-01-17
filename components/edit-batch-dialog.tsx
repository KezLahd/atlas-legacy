"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Pencil } from "lucide-react"
import type { Creator, Batch } from "@/lib/types/database"

interface EditBatchDialogProps {
  batch: Batch
  creators: Creator[]
  onBatchUpdated: () => void
}

export function EditBatchDialog({ batch, creators, onBatchUpdated }: EditBatchDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState(batch.name)
  const [startDate, setStartDate] = useState(batch.start_date || "")
  const [endDate, setEndDate] = useState(batch.end_date || "")
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      loadBatchCreators()
    }
  }, [open])

  const loadBatchCreators = async () => {
    const { data } = await supabase.from("batch_creators").select("creator_id").eq("batch_id", batch.id)

    if (data) {
      setSelectedCreators(data.map((bc) => bc.creator_id))
    }
  }

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
      // Update batch
      const { error: batchError } = await supabase
        .from("batches")
        .update({
          name,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .eq("id", batch.id)

      if (batchError) throw batchError

      // Delete existing batch_creators
      await supabase.from("batch_creators").delete().eq("batch_id", batch.id)

      // Add new creators to batch
      for (const creatorId of selectedCreators) {
        await supabase.from("batch_creators").insert({
          batch_id: batch.id,
          creator_id: creatorId,
        })
      }

      setOpen(false)
      onBatchUpdated()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Edit Batch</DialogTitle>
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

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Updating..." : "Update Batch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
