"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function CreatorDetailLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto p-6 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48 bg-muted" />
            <Skeleton className="h-4 w-64 bg-muted" />
          </div>
        </div>

        {/* Production Stage Chart (not in a card) */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-48 bg-muted" />
          <div className="px-0">
            <div className="flex items-end gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-8 rounded-t-md bg-muted" />
              ))}
            </div>
          </div>
        </div>

        {/* Creator Details Card */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <Skeleton className="h-5 w-32 bg-muted" />
            <Skeleton className="h-8 w-24 bg-muted" />
          </div>
          <div className="px-6 py-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 bg-muted" />
                <Skeleton className="h-7 w-32 bg-muted" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 bg-muted" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16 bg-muted" />
                  <Skeleton className="h-6 w-20 bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 bg-muted" />
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-6 w-6 rounded-full bg-muted" />
                  <Skeleton className="h-6 w-6 rounded-full bg-muted" />
                  <Skeleton className="h-6 w-6 rounded-full bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 bg-muted" />
                <Skeleton className="h-4 w-28 bg-muted" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 bg-muted" />
                  <Skeleton className="h-6 w-24 bg-muted" />
                  <Skeleton className="h-6 w-16 bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - empty (chart moved above details) */}
          <div className="lg:col-span-2 space-y-6" />

          {/* Right Column - Sidebar cards */}
          <div className="space-y-6">
            {/* Platform chart skeleton */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-6 py-4">
                <Skeleton className="h-5 w-40 bg-muted" />
              </div>
              <div className="px-4 py-6 flex items-center justify-center">
                <Skeleton className="h-32 w-32 rounded-full bg-muted" />
              </div>
            </div>

            {/* Upcoming posts skeleton */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-6 py-4">
                <Skeleton className="h-5 w-32 bg-muted" />
              </div>
              <div className="px-6 py-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 bg-muted" />
                      <Skeleton className="h-3 w-24 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Series skeleton */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-6 py-4">
                <Skeleton className="h-5 w-24 bg-muted" />
              </div>
              <div className="px-6 py-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28 bg-muted" />
                    <Skeleton className="h-3 w-16 bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


