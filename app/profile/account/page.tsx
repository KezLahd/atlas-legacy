"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Save, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarType, setAvatarType] = useState<"initials" | "upload">("initials")
  const [avatarBgColor, setAvatarBgColor] = useState("#89cff0")
  const [avatarTextColor, setAvatarTextColor] = useState("#ffffff")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [selectedTheme, setSelectedTheme] = useState<string>("about-a-boy")

  const [hasChanges, setHasChanges] = useState(false)
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!initialData) return

    const changed =
      firstName !== initialData.firstName ||
      lastName !== initialData.lastName ||
      avatarType !== initialData.avatarType ||
      avatarBgColor !== initialData.avatarBgColor ||
      avatarTextColor !== initialData.avatarTextColor ||
      avatarFile !== null

    setHasChanges(changed)
  }, [firstName, lastName, avatarType, avatarBgColor, avatarTextColor, avatarFile, initialData])

  const loadData = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      router.push("/auth/login")
      return
    }
    setUser(authUser)

    const { data: profileData } = await supabase.from("user_profiles").select("*").eq("id", authUser.id).single()

    if (profileData) {
      setProfile(profileData)
      setFirstName(profileData.first_name || "")
      setLastName(profileData.last_name || "")
      setEmail(profileData.email || authUser.email || "")
      setAvatarType(profileData.avatar_type || "initials")
      setAvatarBgColor(profileData.avatar_bg_color || "#89cff0")
      setAvatarTextColor(profileData.avatar_text_color || "#ffffff")

      if (profileData.avatar_storage_path) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(profileData.avatar_storage_path)
        setAvatarUrl(data.publicUrl)
      }

      setSelectedTheme(profileData.theme_preset || "about-a-boy")

      setInitialData({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        avatarType: profileData.avatar_type || "initials",
        avatarBgColor: profileData.avatar_bg_color || "#89cff0",
        avatarTextColor: profileData.avatar_text_color || "#ffffff",
      })
    }

    setLoading(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB")
      return
    }

    setAvatarFile(file)
    setAvatarUrl(URL.createObjectURL(file))
    setAvatarType("upload")
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      let avatarStoragePath = profile?.avatar_storage_path

      // Upload avatar if file selected
      if (avatarFile && avatarType === "upload") {
        const fileExt = avatarFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        avatarStoragePath = fileName
      }

      // Update user_profiles
      const { error: profileError } = await supabase.from("user_profiles").upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        avatar_type: avatarType,
        avatar_bg_color: avatarBgColor,
        avatar_text_color: avatarTextColor,
        avatar_storage_path: avatarType === "upload" ? avatarStoragePath : null,
        theme_preset: selectedTheme,
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError

      setSuccess("Profile updated successfully")
      applyTheme(selectedTheme)
      await loadData()
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const applyTheme = (theme: string) => {
    if (theme === "what-about-the-girl") {
      document.documentElement.style.setProperty("--color-accent", "#ffc0cb")
      document.documentElement.style.setProperty("--color-ring", "#ffc0cb")
    } else {
      document.documentElement.style.setProperty("--color-accent", "#89cff0")
      document.documentElement.style.setProperty("--color-ring", "#89cff0")
    }
  }

  useEffect(() => {
    if (selectedTheme) {
      applyTheme(selectedTheme)
    }
  }, [selectedTheme])

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) return firstName[0].toUpperCase()
    if (email) return email[0].toUpperCase()
    return "U"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <Skeleton className="h-9 w-48 bg-muted" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full bg-muted" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 flex-1 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Personal Profile</h1>
          <p className="text-muted-foreground">Manage your personal account settings and profile appearance</p>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-500">
            <CardContent className="pt-6">
              <p className="text-sm text-green-700">{success}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Profile Information</CardTitle>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Save className="size-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled />
              <p className="text-xs text-muted-foreground">
                Email changes require verification and will be available soon
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Profile Avatar</CardTitle>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Save className="size-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {/* Avatar Preview - 1 column */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="size-24 md:size-32">
                {avatarType === "upload" && avatarUrl ? (
                  <AvatarImage src={avatarUrl || "/placeholder.svg"} alt="Profile" />
                ) : (
                  <AvatarFallback
                    className="text-2xl font-semibold"
                    style={{ backgroundColor: avatarBgColor, color: avatarTextColor }}
                  >
                    {getInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="text-sm text-muted-foreground">Preview</p>
            </div>

            {/* Avatar Type Toggle - 2 columns side by side */}
            <div className="space-y-3">
              <Label>Avatar Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={avatarType === "initials" ? "default" : "outline"}
                  onClick={() => setAvatarType("initials")}
                  className="w-full"
                  size="sm"
                >
                  <User className="size-4 mr-2" />
                  Initials Badge
                </Button>
                <Button
                  variant={avatarType === "upload" ? "default" : "outline"}
                  onClick={() => setAvatarType("upload")}
                  className="w-full"
                  size="sm"
                >
                  <Upload className="size-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </div>

            {avatarType === "initials" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={avatarBgColor}
                      onChange={(e) => setAvatarBgColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={avatarBgColor}
                      onChange={(e) => setAvatarBgColor(e.target.value)}
                      placeholder="#89cff0"
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={avatarTextColor}
                      onChange={(e) => setAvatarTextColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={avatarTextColor}
                      onChange={(e) => setAvatarTextColor(e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {avatarType === "upload" && (
              <div
                className="border-2 border-dashed rounded-lg p-4 md:p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById("avatar-upload")?.click()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    const event = { target: { files: [file] } } as any
                    handleAvatarUpload(event)
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 2MB</p>
              </div>
            )}

            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
