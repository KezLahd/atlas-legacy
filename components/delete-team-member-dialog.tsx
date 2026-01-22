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
import { Trash2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface DeleteTeamMemberDialogProps {
  memberId: string
  userId: string
  memberName: string
  memberEmail: string
  workspaceId: string
  isCurrentUser: boolean
}

export function DeleteTeamMemberDialog({
  memberId,
  userId,
  memberName,
  memberEmail,
  workspaceId,
  isCurrentUser,
}: DeleteTeamMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const supabase = createClient()

      // Get counts for warning display
      const { data: creatorAccess } = await supabase
        .from("creator_access")
        .select("id", { count: "exact" })
        .eq("workspace_member_id", memberId)

      // Delete workspace_member record
      // This will cascade delete:
      // - creator_access records (ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId)

      if (deleteError) throw deleteError

      toast({
        title: "Team member removed",
        description: `${memberName} has been removed from the workspace.`,
      })

      if (isCurrentUser) {
        // If user deleted themselves, redirect to onboarding
        router.push("/onboarding")
      } else {
        // Refresh the current page
        router.refresh()
      }
    } catch (error: any) {
      console.error("[v0] Error deleting team member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
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
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              {isCurrentUser ? "Leave Workspace?" : `Remove ${memberName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-left">
              <p className="font-semibold text-foreground">
                {isCurrentUser 
                  ? "Are you sure you want to leave this workspace? You will lose access to:"
                  : `Removing ${memberName} (${memberEmail}) will delete:`
                }
              </p>
              
              <div className="space-y-2 pl-4">
                <div className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span><strong>Workspace Membership:</strong> Access to all workspace features</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span><strong>Creator Access:</strong> Permissions to view/edit specific creators</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> The user's profile and audit log history will be preserved. 
                  Only workspace membership and creator access will be removed.
                </p>
              </div>

              {isCurrentUser && (
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Warning:</strong> After leaving, you'll need a new invitation to rejoin this workspace.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : isCurrentUser ? "Leave Workspace" : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
