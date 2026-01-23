"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Footer } from "@/components/footer"
import { Lightbulb, Plus, Pencil, Trash2, Sparkles, Filter } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { createBrainstorm, updateBrainstorm, deleteBrainstorm } from "@/app/actions/brainstorm"
import { useToast } from "@/hooks/use-toast"
import { CreateContentDialog } from "@/components/create-content-dialog"
import { UserAvatar } from "@/components/user-avatar"
import type { Creator } from "@/lib/types/database"

interface Brainstorm {
  id: string
  title: string
  description: string | null
  user_id: string
  created_at: string
  updated_at: string
  created_by?: {
    first_name: string
    last_name: string
    email: string
    avatar_type?: string
    avatar_bg_color?: string
    avatar_text_color?: string
    avatar_storage_path?: string
  }
}

export default function BrainstormPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [brainstorms, setBrainstorms] = useState<Brainstorm[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceType, setWorkspaceType] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("")

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Editing state for save operation
  const [isEditing, setIsEditing] = useState(false)
  const [editingBrainstorm, setEditingBrainstorm] = useState<Brainstorm | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  // Ideate dialog state
  const [ideateOpen, setIdeateOpen] = useState(false)
  const [ideatingBrainstorm, setIdeatingBrainstorm] = useState<Brainstorm | null>(null)

  // Detail popup state
  const [selectedBrainstorm, setSelectedBrainstorm] = useState<Brainstorm | null>(null)
  const [isEditingInPopup, setIsEditingInPopup] = useState(false)
  const [popupEditTitle, setPopupEditTitle] = useState("")
  const [popupEditDescription, setPopupEditDescription] = useState("")

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [brainstormToDelete, setBrainstormToDelete] = useState<string | null>(null)

  // Filtered brainstorms based on selected member
  const filteredBrainstorms = selectedMember === "all" 
    ? brainstorms 
    : brainstorms.filter(b => b.user_id === selectedMember)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      router.push("/auth/login")
      return
    }

    setUser(authUser)

    // Get workspace
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(type)")
      .eq("user_id", authUser.id)
      .single()

    if (!memberData) {
      router.push("/onboarding")
      return
    }

    setWorkspaceId(memberData.workspace_id)
    setUserRole(memberData.role)
    setWorkspaceType((memberData.workspaces as any)?.type || "")

    // Load workspace members for filter (only for owners/managers)
    if (memberData.role === "owner" || memberData.role === "manager") {
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select(`
          user_id,
          user_profiles!inner(first_name, last_name, email)
        `)
        .eq("workspace_id", memberData.workspace_id)

      if (membersData) {
        setWorkspaceMembers(membersData)
      }
    }

    // Load brainstorms
    let brainstormsQuery = supabase
      .from("brainstorms")
      .select("*")
      .eq("workspace_id", memberData.workspace_id)

    // For non-owners/managers, only show their own brainstorms
    if (memberData.role !== "owner" && memberData.role !== "manager") {
      brainstormsQuery = brainstormsQuery.eq("user_id", authUser.id)
    }

    const { data: brainstormsData, error: brainstormsError } = await brainstormsQuery.order("created_at", { ascending: false })

    console.log("[v0] Brainstorms query result:", { brainstormsData, brainstormsError, role: memberData.role })

    if (brainstormsData && brainstormsData.length > 0) {
      // Fetch user profiles for the creators if owner/manager
      if (memberData.role === "owner" || memberData.role === "manager") {
        const userIds = [...new Set(brainstormsData.map((b: any) => b.user_id))]
        const { data: profilesData } = await supabase
          .from("user_profiles")
          .select("id, first_name, last_name, email, avatar_type, avatar_bg_color, avatar_text_color, avatar_storage_path")
          .in("id", userIds)

        const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || [])

        const processedData = brainstormsData.map((b: any) => ({
          ...b,
          created_by: profilesMap.get(b.user_id)
        }))
        console.log("[v0] Processed brainstorms with user info:", processedData)
        setBrainstorms(processedData)
      } else {
        setBrainstorms(brainstormsData)
      }
    } else {
      setBrainstorms([])
    }

    // Load creators for ideate dialog
    const { data: creatorsData } = await supabase
      .from("creators")
      .select("*")
      .eq("workspace_id", memberData.workspace_id)
      .order("name")

    // Load creator access and workspace members with profiles for these creators
    let creatorsWithProfiles = []
    if (creatorsData && creatorsData.length > 0) {
      // Get creator access records to link creators to workspace members
      const { data: accessData } = await supabase
        .from("creator_access")
        .select("creator_id, workspace_member_id")
        .in("creator_id", creatorsData.map(c => c.id))

      // Get workspace members with profiles
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, user_profiles(first_name, last_name, email, avatar_type, avatar_bg_color, avatar_text_color, avatar_storage_path)")
        .eq("workspace_id", memberData.workspace_id)

      // Get workspace info
      const { data: workspaceInfo } = await supabase
        .from("workspaces")
        .select("type, owner_id")
        .eq("id", memberData.workspace_id)
        .single()

      // For each creator, find the workspace member who has access to it
      creatorsWithProfiles = creatorsData.map((creator: any) => {
        const accessRecord = accessData?.find((access: any) => access.creator_id === creator.id)
        let matchingMember = null
        
        if (accessRecord) {
          matchingMember = membersData?.find((member: any) => member.id === accessRecord.workspace_member_id)
        }

        // Fallback logic for legacy data
        if (!matchingMember) {
          if (workspaceInfo?.type === "personal_creator") {
            matchingMember = membersData?.find((member: any) => member.role === "owner")
          } else {
            matchingMember = membersData?.find((member: any) => member.role === "creator" || member.role === "owner")
          }
        }

        return {
          ...creator,
          workspace_members: matchingMember ? [matchingMember] : []
        }
      })

      // Load platforms for creators
      const { data: platformsData } = await supabase
        .from("creator_platforms")
        .select(`
          platform_id,
          creator_id,
          platforms (*)
        `)
        .in("creator_id", creatorsData.map((c) => c.id))

      // Attach platforms to creators
      creatorsWithProfiles = creatorsWithProfiles.map((creator: any) => ({
        ...creator,
        creator_platforms: platformsData?.filter((p: any) => p.creator_id === creator.id) || []
      }))
    }

    if (creatorsWithProfiles.length > 0) {
      setCreators(creatorsWithProfiles as any)
    }

    setIsLoading(false)
  }

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your brainstorm",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    const result = await createBrainstorm({
      workspaceId,
      title: createTitle,
      description: createDescription,
    })

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Brainstorm created successfully",
      })
      setCreateOpen(false)
      setCreateTitle("")
      setCreateDescription("")
      loadData()
    }
    setIsCreating(false)
  }

  const confirmDelete = (id: string) => {
    setBrainstormToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!brainstormToDelete) return

    const result = await deleteBrainstorm(brainstormToDelete)

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error || "Failed to delete brainstorm",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Brainstorm deleted successfully",
      })
      loadData()
    }

    setDeleteConfirmOpen(false)
    setBrainstormToDelete(null)
  }

  const openIdeateDialog = (brainstorm: Brainstorm) => {
    setIdeatingBrainstorm(brainstorm)
    setIdeateOpen(true)
  }

  const openDetailPopup = (brainstorm: Brainstorm) => {
    setSelectedBrainstorm(brainstorm)
    setIsEditingInPopup(false)
    setPopupEditTitle(brainstorm.title)
    setPopupEditDescription(brainstorm.description || "")
  }

  const closeDetailPopup = () => {
    setSelectedBrainstorm(null)
    setIsEditingInPopup(false)
  }

  const toggleEditMode = () => {
    setIsEditingInPopup(!isEditingInPopup)
  }

  const handlePopupSave = async () => {
    if (!selectedBrainstorm || !popupEditTitle.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      })
      return
    }

    setIsEditing(true)
    const result = await updateBrainstorm({
      id: selectedBrainstorm.id,
      title: popupEditTitle,
      description: popupEditDescription,
    })

    if (result.success) {
      toast({
        title: "Success",
        description: "Brainstorm updated successfully",
      })
      await loadData()
      setSelectedBrainstorm({
        ...selectedBrainstorm,
        title: popupEditTitle,
        description: popupEditDescription,
      })
      setIsEditingInPopup(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update brainstorm",
        variant: "destructive",
      })
    }

    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lightbulb className="size-8 text-[#3a2415]" />
              <h1 className="text-3xl font-bold">Brainstorm</h1>
            </div>

            <div className="flex items-center gap-3">
              {(userRole === "owner" || userRole === "manager") && workspaceMembers.length > 0 && (
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="size-4 mr-2" />
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {workspaceMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.user_profiles.first_name} {member.user_profiles.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4 mr-2" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl min-w-0 w-[calc(100%-2rem)] sm:w-full bg-white">
                  <DialogHeader>
                    <DialogTitle>Create New Brainstorm</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 min-w-0">
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="create-title">Title</Label>
                      <Input
                        id="create-title"
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        placeholder="Enter brainstorm title..."
                        className="min-w-0 break-all"
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="create-description">Description</Label>
                      <Textarea
                        id="create-description"
                        value={createDescription}
                        onChange={(e) => setCreateDescription(e.target.value)}
                        placeholder="Enter brainstorm description..."
                        rows={6}
                        className="resize-none min-w-0 break-all max-h-[300px] overflow-y-auto"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!isLoading && brainstorms.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No brainstorms yet. Start capturing your ideas!</p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4 mr-2" />
                  Create Your First Brainstorm
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-accent hover:bg-accent">
                    <TableHead className="text-white">Title</TableHead>
                    {(userRole === "owner" || userRole === "manager") && (
                      <TableHead className="text-white max-w-[150px]">Created By</TableHead>
                    )}
                    <TableHead className="text-white max-w-[120px]">Created</TableHead>
                    <TableHead className="text-white text-right max-w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-5 w-full max-w-md" />
                        </TableCell>
                        {(userRole === "owner" || userRole === "manager") && (
                          <TableCell>
                            <Skeleton className="h-5 w-32" />
                          </TableCell>
                        )}
                        <TableCell>
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    filteredBrainstorms.map((brainstorm) => {
                      const truncatedTitle = brainstorm.title.length > 60
                        ? `${brainstorm.title.substring(0, 60)}...`
                        : brainstorm.title

                      return (
                        <TableRow
                          key={brainstorm.id}
                          className="cursor-pointer hover:bg-accent/10 transition-colors"
                          onClick={() => openDetailPopup(brainstorm)}
                        >
                          <TableCell className="font-medium">
                            <div className="truncate" title={brainstorm.title}>
                              {truncatedTitle}
                            </div>
                          </TableCell>
                          {(userRole === "owner" || userRole === "manager") && (
                            <TableCell className="whitespace-nowrap">
                              {brainstorm.created_by ? (
                                <>
                                  <div className="md:hidden flex justify-center">
                                    <UserAvatar
                                      profile={brainstorm.created_by}
                                      size="xs"
                                    />
                                  </div>
                                  <div className="hidden md:block text-sm">
                                    {`${brainstorm.created_by.first_name} ${brainstorm.created_by.last_name}`}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Unknown</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm">
                              {new Date(brainstorm.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetailPopup(brainstorm)
                                  setIsEditingInPopup(true)
                                }}
                                title="Edit"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  confirmDelete(brainstorm.id)
                                }}
                                title="Delete"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openIdeateDialog(brainstorm)
                                }}
                                title="Ideate"
                              >
                                <Sparkles className="size-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ideate</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Ideate Dialog - Modified Create Content Dialog */}
      {ideatingBrainstorm && (
        <CreateContentDialog
          workspaceId={workspaceId}
          creators={creators}
          onContentCreated={() => {
            setIdeateOpen(false)
            setIdeatingBrainstorm(null)
            loadData()
          }}
          workspaceType={workspaceType}
          userRole={userRole}
          open={ideateOpen}
          onOpenChange={setIdeateOpen}
          initialValues={{
            hook: ideatingBrainstorm.title,
          }}
          brainstormContext={{
            id: ideatingBrainstorm.id,
            title: ideatingBrainstorm.title,
            description: ideatingBrainstorm.description || "",
          }}
        />
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedBrainstorm}
        onOpenChange={(open) => {
          if (!open) {
            if (isEditingInPopup) {
              setIsEditingInPopup(false)
              setPopupEditTitle(selectedBrainstorm?.title || "")
              setPopupEditDescription(selectedBrainstorm?.description || "")
            } else {
              closeDetailPopup()
            }
          }
        }}
      >
        <DialogContent className="max-w-2xl min-w-0 w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto bg-white">
          {selectedBrainstorm && (
            <>
              <DialogHeader>
                {isEditingInPopup ? (
                  <Input
                    value={popupEditTitle}
                    onChange={(e) => setPopupEditTitle(e.target.value)}
                    className="text-xl font-semibold min-w-0 break-all"
                    placeholder="Brainstorm title..."
                  />
                ) : (
                  <DialogTitle className="text-xl font-semibold break-words pr-4">
                    {selectedBrainstorm.title}
                  </DialogTitle>
                )}
              </DialogHeader>

              <div className="space-y-6 min-w-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground mb-3">
                    Created: {new Date(selectedBrainstorm.created_at).toLocaleDateString()}
                  </div>
                  {isEditingInPopup ? (
                    <Textarea
                      value={popupEditDescription}
                      onChange={(e) => setPopupEditDescription(e.target.value)}
                      placeholder="Enter brainstorm description..."
                      rows={10}
                      className="resize-none min-w-0 break-all max-h-[400px] overflow-y-auto"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 max-h-[400px] overflow-y-auto">
                      {selectedBrainstorm.description ? (
                        <div className="text-base whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                          {selectedBrainstorm.description}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No description provided</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                {isEditingInPopup ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingInPopup(false)
                        setPopupEditTitle(selectedBrainstorm.title)
                        setPopupEditDescription(selectedBrainstorm.description || "")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handlePopupSave} disabled={isEditing}>
                      {isEditing ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={toggleEditMode}>
                      <Pencil className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        confirmDelete(selectedBrainstorm.id)
                        closeDetailPopup()
                      }}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      onClick={() => {
                        openIdeateDialog(selectedBrainstorm)
                        closeDetailPopup()
                      }}
                      className="ml-auto"
                    >
                      <Sparkles className="size-4 mr-2" />
                      Ideate
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brainstorm</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this brainstorm? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
