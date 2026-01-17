import { Suspense } from "react"
import ScriptingContent from "./scripting-content"

export default function ScriptingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ScriptingContent />
    </Suspense>
  )
}
