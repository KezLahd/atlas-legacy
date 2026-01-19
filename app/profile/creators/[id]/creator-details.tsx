"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Pencil } from "lucide-react"
import { CreatorEditor } from "./creator-editor"
import { cn } from "@/lib/utils"

interface PlatformDisplay {
  name: string
  icon?: string
}

interface ContentType {
  id: number
  name: string
  description: string
  icon: string
}

interface CreatorDetailsProps {
  creatorId: string
  name: string
  brandName?: string | null
  primaryNiche: string
  subNiches: string[]
  platforms: PlatformDisplay[]
  postingFrequency: number | null
  orderedContentTypes: ContentType[]
  platformConfig: Record<string, { icon: string }>
  platformOptions: { id: string; name: string }[]
  selectedPlatformIds: string[]
  contentTypeOrder: number[]
  allContentTypes: ContentType[]
  canEdit: boolean
}

export function CreatorDetails({
  creatorId,
  name,
  brandName,
  primaryNiche,
  subNiches,
  platforms,
  postingFrequency,
  orderedContentTypes,
  platformConfig,
  platformOptions,
  selectedPlatformIds,
  contentTypeOrder,
  allContentTypes,
  canEdit,
}: CreatorDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editorState, setEditorState] = useState<{ hasChanges: boolean; isSaving: boolean }>({ hasChanges: false, isSaving: false })
  const editorApiRef = useRef<{ save: () => void; cancel: () => void } | null>(null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Creator Details</CardTitle>
          {brandName && <p className="text-sm text-muted-foreground">{brandName}</p>}
        </div>
        {canEdit && (
          isEditing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  editorApiRef.current?.cancel()
                  setIsEditing(false)
                }}
                disabled={editorState.isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!editorState.hasChanges || editorState.isSaving}
                onClick={() => {
                  editorApiRef.current?.save()
                }}
              >
                {editorState.isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4 mr-2" />
              Edit
            </Button>
          )
        )}
      </CardHeader>
      <CardContent>
        {!isEditing && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Primary Niche</p>
              <Badge variant="secondary" className="text-base">
                {primaryNiche}
              </Badge>
            </div>

            {subNiches.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Sub-Niches</p>
                <div className="flex flex-wrap gap-2">
                  {subNiches.map((sn, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {sn}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Platforms</p>
              <div className="flex flex-wrap gap-3">
                {platforms.length > 0 ? (
                  platforms.map((p, idx) => {
                    const icon = platformConfig[p.name.toLowerCase()]?.icon || p.icon
                    return (
                      <div key={idx} className="flex items-center gap-2" title={p.name}>
                        {icon ? (
                          <img src={icon} alt={p.name} className="size-6 object-contain" />
                        ) : (
                          <span className="text-sm font-medium">{p.name}</span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No platforms configured</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Posting Framework</p>
              {postingFrequency ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span className="font-semibold">{postingFrequency} posts/week</span>
                  </div>
                  {orderedContentTypes && orderedContentTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {orderedContentTypes.map((contentType, index) => (
                        <div
                          key={contentType?.id || index}
                          className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs"
                        >
                          <span>{contentType?.icon || "📝"}</span>
                          <span className="font-medium">{contentType?.name || "Content"}</span>
                          <span className="text-muted-foreground">(Day {index + 1})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Content types not configured</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No posting framework configured</p>
              )}
            </div>
          </div>
        )}

        {isEditing && (
          <div className={cn("mt-4")}>
            <CreatorEditor
              creatorId={creatorId}
              name={name}
              brandName={brandName}
              primaryNiche={primaryNiche}
              subNiches={subNiches}
              platformOptions={platformOptions}
              selectedPlatformIds={selectedPlatformIds}
              postingFrequency={postingFrequency}
              contentTypeOrder={contentTypeOrder}
              allContentTypes={allContentTypes}
              canEdit={canEdit}
              onStateChange={setEditorState}
              hideHeaderActions={true}
              registerApi={(api) => {
                editorApiRef.current = api
              }}
              onSaved={() => setIsEditing(false)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

