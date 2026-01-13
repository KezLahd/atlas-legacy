import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail } from "lucide-react"
import { AtlasLogo } from "@/components/atlas-logo"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 self-center">
            <AtlasLogo size={32} />
            <span className="font-bold text-xl">
              <span className="text-accent">at</span>
              <span className="text-primary">las</span>
            </span>
          </Link>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>We sent you a confirmation link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in your email to confirm your account and start using Atlas.
              </p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/auth/login">Back to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
