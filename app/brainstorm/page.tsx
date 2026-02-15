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
import { Lightbulb, Plus, Pencil, Trash2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createBrainstorm, updateBrainstorm, deleteBrainstorm } from "@/app/actions/brainstorm"
import { useToast } from "@/hooks/use-toast"
import { CreateContentDialog } from "@/components/create-content-dialog"
import type { Creator } from "@/lib/types/database"

interface Brainstorm {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export default function BrainstormPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [brainstorms, setBrainstorms] = useState<Brainstorm[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceType, setWorkspaceType] = useState<string>("")
  const [userRole, setUserRole] = useState<string>("")

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingBrainstorm, setEditingBrainstorm] = useState<Brainstorm | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Ideate dialog state
  const [ideateOpen, setIdeateOpen] = useState(false)
  const [ideatingBrainstorm, setIdeatingBrainstorm] = useState<Brainstorm | null>(null)

  // Detail popup state
  const [selectedBrainstorm, setSelectedBrainstorm] = useState<Brainstorm | null>(null)

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

    // Load brainstorms
    const { data: brainstormsData } = await supabase
      .from("brainstorms")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("workspace_id", memberData.workspace_id)
      .order("created_at", { ascending: false })

    if (brainstormsData) {
      setBrainstorms(brainstormsData)
    }

    // Load creators for ideate dialog
    const { data: creatorsData } = await supabase
      .from("user_profiles")
      .select(`
        id,
        workspace_id,
        name,
        brand_name,
        primary_niche,
        created_at,
        updated_at,
        workspace_members!inner(user_id, user_profiles!inner(first_name, last_name, email, avatar_type, avatar_bg_color, avatar_text_color, avatar_storage_path))
      `)
      .eq("workspace_id", memberData.workspace_id)
      .order("name")

    if (creatorsData) {
      setCreators(creatorsData as any)
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

  const handleEdit = async () => {
    if (!editingBrainstorm || !editTitle.trim()) {
      return
    }

    setIsEditing(true)
    const result = await updateBrainstorm({
      id: editingBrainstorm.id,
      title: editTitle,
      description: editDescription,
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
        description: "Brainstorm updated successfully",
      })
      setEditOpen(false)
      setEditingBrainstorm(null)
      loadData()
    }
    setIsEditing(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brainstorm?")) {
      return
    }

    const result = await deleteBrainstorm(id)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Brainstorm deleted successfully",
      })
      loadData()
    }
  }

  const openEditDialog = (brainstorm: Brainstorm) => {
    setEditingBrainstorm(brainstorm)
    setEditTitle(brainstorm.title)
    setEditDescription(brainstorm.description || "")
    setEditOpen(true)
  }

  const openIdeateDialog = (brainstorm: Brainstorm) => {
    setIdeatingBrainstorm(brainstorm)
    setIdeateOpen(true)
  }

  const openDetailPopup = (brainstorm: Brainstorm) => {
    setSelectedBrainstorm(brainstorm)
  }

  const closeDetailPopup = () => {
    setSelectedBrainstorm(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav userEmail={user?.email} />
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <p>Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
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

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-2" />
                  New Brainstorm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Brainstorm</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="create-title">Title</Label>
                    <Input
                      id="create-title"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="Enter brainstorm title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-description">Description</Label>
                    <Textarea
                      id="create-description"
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      placeholder="Enter brainstorm description..."
                      rows={4}
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

          {brainstorms.length === 0 ? (
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
                    <TableHead className="text-white max-w-[120px]">Created</TableHead>
                    <TableHead className="text-white text-right max-w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brainstorms.map((brainstorm) => {
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
                                openEditDialog(brainstorm)
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
                                handleDelete(brainstorm.id)
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
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brainstorm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter brainstorm title..."
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter brainstorm description..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={isEditing}>
                {isEditing ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Detail Popup */}
      {selectedBrainstorm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={closeDetailPopup}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-t-lg shadow-lg transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold truncate" title={selectedBrainstorm.title}>
                  {selectedBrainstorm.title}
                </h3>
                <Button variant="ghost" size="sm" onClick={closeDetailPopup}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Created: {new Date(selectedBrainstorm.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground bg-gray-50 rounded-md p-4">
                    {selectedBrainstorm.description ? (
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{selectedBrainstorm.description}</div>
                    ) : (
                      <span className="italic">No description provided</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      openEditDialog(selectedBrainstorm)
                      closeDetailPopup()
                    }}
                  >
                    <Pencil className="size-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this brainstorm?")) {
                        handleDelete(selectedBrainstorm.id)
                        closeDetailPopup()
                      }
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
                  >
                    <Sparkles className="size-4 mr-2" />
                    Ideate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
