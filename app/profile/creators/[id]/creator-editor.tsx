"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CardDescription } from "@/components/ui/card"
import { updateCreatorProfile } from "@/app/actions/onboarding"
import { cn } from "@/lib/utils"

interface PlatformOption {
  id: string
  name: string
}

interface ContentType {
  id: number
  name: string
  description: string
  icon: string
}

interface CreatorEditorProps {
  creatorId: string
  name: string
  brandName?: string | null
  primaryNiche: string
  subNiches: string[]
  platformOptions: PlatformOption[]
  selectedPlatformIds: string[]
  postingFrequency: number | null
  contentTypeOrder: number[]
  allContentTypes: ContentType[]
  canEdit: boolean
  onStateChange?: (state: { hasChanges: boolean; isSaving: boolean }) => void
  hideHeaderActions?: boolean
  registerApi?: (api: { save: () => void; cancel: () => void }) => void
  onSaved?: () => void
}

export function CreatorEditor({
  creatorId,
  name,
  brandName,
  primaryNiche,
  subNiches,
  platformOptions,
  selectedPlatformIds,
  postingFrequency,
  contentTypeOrder,
  allContentTypes,
  canEdit,
  onStateChange,
  hideHeaderActions = true,
  registerApi,
  onSaved,
}: CreatorEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const initialForm = useMemo(
    () => ({
      primaryNiche: primaryNiche || "",
      subNiches: subNiches.length ? subNiches : [""],
      selectedPlatforms: selectedPlatformIds,
      postingFrequency: postingFrequency || 7,
      contentTypeOrder: contentTypeOrder.length ? contentTypeOrder : allContentTypes.map((ct) => ct.id),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creatorId],
  )

  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasChanges =
    form.primaryNiche !== initialForm.primaryNiche ||
    form.postingFrequency !== initialForm.postingFrequency ||
    JSON.stringify(form.subNiches) !== JSON.stringify(initialForm.subNiches) ||
    JSON.stringify([...form.selectedPlatforms].sort()) !== JSON.stringify([...initialForm.selectedPlatforms].sort()) ||
    JSON.stringify(form.contentTypeOrder) !== JSON.stringify(initialForm.contentTypeOrder)

  useEffect(() => {
    onStateChange?.({ hasChanges, isSaving })
  }, [hasChanges, isSaving, onStateChange])

  useEffect(() => {
    // Register callbacks for parent header buttons
    registerApi?.({ save: handleSave, cancel: handleCancel })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerApi, creatorId])

  useEffect(() => {
    // When creatorId changes (navigation), reset the form
    setForm(initialForm)
    setError(null)
    setSuccess(null)
  }, [initialForm])

  const togglePlatform = (id: string) => {
    setForm((prev) => {
      const exists = prev.selectedPlatforms.includes(id)
      return {
        ...prev,
        selectedPlatforms: exists ? prev.selectedPlatforms.filter((p) => p !== id) : [...prev.selectedPlatforms, id],
      }
    })
  }

  const addSubNiche = () => {
    setForm((prev) => ({
      ...prev,
      subNiches: [...prev.subNiches, ""].slice(0, 5),
    }))
  }

  const updateSubNiche = (idx: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.subNiches]
      next[idx] = value
      return { ...prev, subNiches: next }
    })
  }

  const removeSubNiche = (idx: number) => {
    setForm((prev) => {
      const next = prev.subNiches.filter((_, i) => i !== idx)
      return { ...prev, subNiches: next.length ? next : [""] }
    })
  }

  // Up/down move for content types (no drag/drop)
  const moveContentType = (idx: number, direction: "up" | "down") => {
    setForm((prev) => {
      const next = [...prev.contentTypeOrder]
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= next.length) return prev
      const temp = next[newIdx]
      next[newIdx] = next[idx]
      next[idx] = temp
      return { ...prev, contentTypeOrder: next }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateCreatorProfile({
        creatorId,
        creator: {
          name,
          brand_name: brandName || undefined,
          primary_niche: form.primaryNiche || "General",
          sub_niches: form.subNiches.filter(Boolean),
          platforms: form.selectedPlatforms,
          posting_frequency: form.postingFrequency,
          excluded_day_types: [],
          content_type_order: form.contentTypeOrder,
        },
      })
      setSuccess("Saved")
      router.refresh()
      onSaved?.()
    } catch (err: any) {
      setError(err.message || "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(initialForm)
    setError(null)
    setSuccess(null)
  }

  const orderedTypes = form.contentTypeOrder
    .map((id) => allContentTypes.find((ct) => ct.id === id))
    .filter(Boolean) as ContentType[]

  return (
    <div className="space-y-4">
      {error && <CardDescription className="text-destructive">{error}</CardDescription>}
      {success && <CardDescription className="text-green-600">{success}</CardDescription>}

      {/* Header actions are rendered by parent (CreatorDetails) */}
      {!hideHeaderActions && canEdit && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={!hasChanges || isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}

      {/* Niche and Sub-niches */}
      <div className="space-y-2">
        <Label>Primary Niche</Label>
        <Input
          value={form.primaryNiche}
          onChange={(e) => setForm((prev) => ({ ...prev, primaryNiche: e.target.value }))}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Sub-niches</Label>
          {canEdit && (
            <Button type="button" size="sm" variant="outline" onClick={addSubNiche}>
              <Plus className="size-4 mr-1" /> Add
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {form.subNiches.map((sn, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={sn}
                onChange={(e) => updateSubNiche(idx, e.target.value)}
                disabled={!canEdit}
                placeholder="Sub-niche"
              />
              {canEdit && form.subNiches.length > 1 && (
                <Button type="button" size="icon" variant="ghost" onClick={() => removeSubNiche(idx)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div className="space-y-2">
        <Label>Platforms</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {platformOptions.map((platform) => {
            const isSelected = form.selectedPlatforms.includes(platform.id)

            // Match onboarding wizard styling
            const platformConfig: Record<string, { icon: string; bg: string; border: string; text: string }> = {
              youtube: {
                icon: "/icons/youtube.svg",
                bg: "bg-red-50",
                border: "border-red-600",
                text: "text-red-700",
              },
              "youtube shorts": {
                icon: "/icons/youtube.svg",
                bg: "bg-red-50",
                border: "border-red-600",
                text: "text-red-700",
              },
              "youtube long": {
                icon: "/icons/youtube.svg",
                bg: "bg-red-50",
                border: "border-red-600",
                text: "text-red-700",
              },
              tiktok: {
                icon: "/icons/tiktok.svg",
                bg: "bg-gradient-to-br from-cyan-50 via-pink-50 to-black/5",
                border: "border-black",
                text: "text-black",
              },
              instagram: {
                icon: "/icons/instagram.svg",
                bg: "bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50",
                border: "border-pink-500",
                text: "text-pink-700",
              },
              twitter: {
                icon: "/icons/x.svg",
                bg: "bg-black/5",
                border: "border-black",
                text: "text-black",
              },
              x: {
                icon: "/icons/x.svg",
                bg: "bg-black/5",
                border: "border-black",
                text: "text-black",
              },
              linkedin: {
                icon: "/icons/linkedin.svg",
                bg: "bg-blue-50",
                border: "border-blue-700",
                text: "text-blue-800",
              },
              facebook: {
                icon: "/icons/facebook.svg",
                bg: "bg-blue-50",
                border: "border-blue-600",
                text: "text-blue-700",
              },
            }

            const config = platformConfig[platform.name.toLowerCase()] || {
              icon: "",
              bg: "bg-gray-50",
              border: "border-gray-400",
              text: "text-gray-700",
            }

            return (
              <div
                key={platform.id}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition-all select-none",
                  canEdit ? "" : "opacity-60 cursor-not-allowed",
                  isSelected ? `${config.bg} border-2 ${config.border} shadow-md` : "bg-background border border-border hover:bg-muted/50",
                )}
                onClick={() => canEdit && togglePlatform(platform.id)}
                role="button"
                tabIndex={0}
              >
                {config.icon ? (
                  <img src={config.icon || "/placeholder.svg"} alt={platform.name} className="w-8 h-8 mb-2" />
                ) : (
                  <span className="text-2xl mb-2">🔗</span>
                )}
                <span className={cn("text-sm font-medium", isSelected ? config.text : "text-foreground")}>
                  {platform.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Posting Framework */}
      <div className="space-y-2">
        <Label>Posting Frequency (posts/week)</Label>
        <Select
          value={form.postingFrequency.toString()}
          onValueChange={(v) => setForm((prev) => ({ ...prev, postingFrequency: Number(v) }))}
          disabled={!canEdit}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 4, 5, 6, 7].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Content Type Order</Label>
        </div>
        <div className="space-y-2">
          {orderedTypes.map((ct, idx) => (
            <div key={ct.id} className="flex items-center gap-2 rounded-md border px-3 py-2 bg-background">
              <div className="text-xl">{ct.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ct.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{ct.description}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={!canEdit || idx === 0}
                  onClick={() => moveContentType(idx, "up")}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={!canEdit || idx === orderedTypes.length - 1}
                  onClick={() => moveContentType(idx, "down")}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!canEdit && (
        <CardDescription className="text-muted-foreground">
          You don’t have permission to edit this creator.
        </CardDescription>
      )}

      {/* Bottom spacer to avoid cramped end */}
      <div className="h-1" />
    </div>
  )
}
