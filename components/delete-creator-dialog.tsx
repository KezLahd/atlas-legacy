"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface DeleteCreatorDialogProps {
  creatorId: string
  creatorName: string
  isOwner: boolean
  userId: string
  contentCount: number
  seriesCount: number
  batchAssignmentCount: number
  sfxBrollCount: number
  batchesCreatedCount: number
  calendarEventsCreatedCount: number
}

export function DeleteCreatorDialog({
  creatorId,
  creatorName,
  isOwner,
  userId,
  contentCount,
  seriesCount,
  batchAssignmentCount,
  sfxBrollCount,
  batchesCreatedCount,
  calendarEventsCreatedCount,
}: DeleteCreatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  
  const confirmationText = `delete ${creatorName}`
  const isConfirmed = confirmText === confirmationText

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const supabase = createClient()

      if (isOwner) {
        // Owner deleting themselves as a creator
        // Delete creator-specific data but keep user profile
        
        // Delete creator_platforms
        await supabase.from("creator_platforms").delete().eq("creator_id", creatorId)
        
        // Delete creator_sub_niches
        await supabase.from("creator_sub_niches").delete().eq("creator_id", creatorId)
        
        // Delete creator_access
        await supabase.from("creator_access").delete().eq("creator_id", creatorId)
        
        // Delete creator_posting_frameworks
        await supabase.from("creator_posting_frameworks").delete().eq("creator_id", creatorId)
        
        // Delete series
        await supabase.from("series").delete().eq("creator_id", creatorId)
        
        // Delete batch_creators links
        await supabase.from("batch_creators").delete().eq("creator_id", creatorId)
        
        // Delete content created FOR this creator (but audit logs remain for history)
        const { data: creatorContent } = await supabase
          .from("content")
          .select("id")
          .eq("creator_id", creatorId)
        
        const contentIds = creatorContent?.map((c: any) => c.id) || []
        
        if (contentIds.length > 0) {
          // Delete content relationships (cascade will handle most)
          await supabase.from("content").delete().eq("creator_id", creatorId)
        }
        
        // Handle calendar events - only delete events created by this creator, otherwise just unassign
        const { data: calendarEvents } = await supabase
          .from("calendar_events")
          .select("id, created_by, assignee_id")
          .eq("assignee_id", userId)
        
        if (calendarEvents && calendarEvents.length > 0) {
          for (const event of calendarEvents) {
            if (event.created_by === userId) {
              // Delete events created by this creator
              await supabase.from("calendar_events").delete().eq("id", event.id)
            } else {
              // Just unassign events created by others
              await supabase.from("calendar_events").update({ assignee_id: null }).eq("id", event.id)
            }
          }
        }
        
        // Finally delete the creator record itself
        const { error: deleteError } = await supabase
          .from("creators")
          .delete()
          .eq("id", creatorId)

        if (deleteError) throw deleteError

        toast({
          title: "Creator deleted",
          description: `You have removed yourself as a creator. Your user account remains active.`,
        })
      } else {
        // Manager/owner deleting another creator
        // This will cascade delete due to ON DELETE CASCADE in schema
        const { error: deleteError } = await supabase
          .from("creators")
          .delete()
          .eq("id", creatorId)

        if (deleteError) throw deleteError

        toast({
          title: "Creator deleted",
          description: `${creatorName} has been permanently deleted from the workspace.`,
        })
      }

      router.push("/profile/creators")
      router.refresh()
    } catch (error: any) {
      console.error("[v0] Error deleting creator:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete creator",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <Trash2 className="size-4 mr-2" />
        Delete Creator
      </Button>

      <AlertDialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setConfirmText("")
      }}>
        <AlertDialogContent className="max-w-2xl bg-white dark:bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              {isOwner ? "Remove Yourself as Creator?" : `Delete ${creatorName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-left">
              <p className="font-semibold text-foreground">
                This action cannot be undone. The following will be permanently deleted:
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Creator Profile:</strong> All creator details, platforms, and sub-niches</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Content ({contentCount}):</strong> All content created FOR this creator including scripts, scenes, analytics</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Series ({seriesCount}):</strong> All series associated with this creator</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Batch Assignments ({batchAssignmentCount}):</strong> Assignments where this creator is linked to batches</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>SFX & B-Roll ({sfxBrollCount}):</strong> All sound effects and B-roll clips created by this creator</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Batches Created ({batchesCreatedCount}):</strong> All batches created by this creator will be deleted, resulting in potentially unbatched content</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Calendar Events Created ({calendarEventsCreatedCount}):</strong> Events created by this creator will be deleted; events created by others will be unassigned</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Batch Assignments ({batchAssignmentCount}):</strong> All batch-creator relationships</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Access Permissions:</strong> All creator access assignments for team members</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Posting Framework:</strong> Custom posting frequency and content type order</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>SFX & B-Roll:</strong> All sound effects and B-roll clips created by this creator</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Batches Created:</strong> All batches created by this creator will be deleted, resulting in potentially unbatched content</span>
                </div>
                
                <div className="flex items-start gap-2 text-foreground">
                  <span className="text-destructive">•</span>
                  <span><strong>Calendar Events:</strong> Events created by this creator will be deleted; events created by others will be unassigned</span>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-md border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> All audit logs will be preserved for workspace history.
                  {isOwner && " Your user account and profile will remain active."}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-foreground">
                  Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">{confirmationText}</span> to confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmationText}
                  className="font-mono bg-white dark:bg-white text-foreground"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !isConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
