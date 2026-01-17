"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  profile: {
    first_name?: string
    last_name?: string
    email?: string
    avatar_type?: "initials" | "upload"
    avatar_bg_color?: string
    avatar_text_color?: string
    avatar_storage_path?: string
  }
  size?: "sm" | "md" | "lg" | "xs"
  className?: string
}

export function UserAvatar({ profile, size = "md", className }: UserAvatarProps) {
  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    if (profile.first_name) return profile.first_name[0].toUpperCase()
    if (profile.email) return profile.email[0].toUpperCase()
    return "U"
  }

  const sizeClasses = {
    xs: "size-5 text-[10px] font-bold",
    sm: "size-6 text-xs font-semibold",
    md: "size-10 text-base font-semibold",
    lg: "size-16 text-2xl font-semibold",
  }

  const avatarUrl = profile.avatar_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_storage_path}`
    : null

  console.log("[v0] UserAvatar rendering:", {
    initials: getInitials(),
    bg_color: profile.avatar_bg_color,
    text_color: profile.avatar_text_color,
    avatar_type: profile.avatar_type,
  })

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {profile.avatar_type === "upload" && avatarUrl ? (
        <AvatarImage src={avatarUrl || "/placeholder.svg"} alt="Profile" />
      ) : (
        <AvatarFallback
          style={{
            backgroundColor: profile.avatar_bg_color || "hsl(var(--accent))",
            color: profile.avatar_text_color || "hsl(var(--accent-foreground))",
          }}
        >
          {getInitials()}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
