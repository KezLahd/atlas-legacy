"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserAvatar } from "@/components/user-avatar"

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar_storage_path: string | null
  avatar_type: string
  avatar_bg_color: string
  avatar_text_color: string
}

interface CalendarMemberFilterProps {
  members: TeamMember[]
  selectedMemberId: string | null
  onMemberChange: (memberId: string | null) => void
}

export function CalendarMemberFilter({ members, selectedMemberId, onMemberChange }: CalendarMemberFilterProps) {
  return (
    <Select value={selectedMemberId || "all"} onValueChange={(value) => onMemberChange(value === "all" ? null : value)}>
      <SelectTrigger className="w-[140px] sm:w-[180px] md:w-[200px] bg-white text-sm">
        <SelectValue placeholder="Team" />
      </SelectTrigger>
      <SelectContent className="bg-white">
        <SelectItem value="all">Team</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <UserAvatar
                profile={{
                  id: member.id,
                  first_name: member.first_name,
                  last_name: member.last_name,
                  avatar_storage_path: member.avatar_storage_path,
                  avatar_type: member.avatar_type,
                  avatar_bg_color: member.avatar_bg_color,
                  avatar_text_color: member.avatar_text_color,
                }}
                size="sm"
              />
              <span className="text-sm">
                {member.first_name} {member.last_name}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
