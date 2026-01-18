"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AtlasLogo } from "@/components/atlas-logo"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function SignUpPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!firstName || !lastName || !email) {
      setError("Please fill in all fields")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setStep(2) // Go to early access code step
  }

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError("Please enter your email address first")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("access_requests")
        .insert({
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setError("An access request has already been submitted for this email address")
        } else {
          throw error
        }
        return
      }

      setError(null)
      toast({
        title: "Access Request Submitted",
        description: "We'll review your request and get back to you soon.",
        variant: "success",
      })
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to submit access request")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!verificationCode) {
      setError("Please enter your early access code")
      return
    }

    // Check against environment variable
    if (verificationCode.trim() !== process.env.NEXT_PUBLIC_VERIFICATION_CODE) {
      setError("Invalid early access code")
      return
    }

    setShowSuccessDialog(true)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/onboarding`,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: "google" | "apple") => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/onboarding`,
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 self-center">
            <AtlasLogo className="size-8 text-primary" />
            <span className="font-bold text-xl">
              <span className="text-accent">at</span>
              <span className="text-primary">las</span>
            </span>
          </Link>
          <Card>
            <CardHeader className="relative">
              <CardTitle className="text-2xl flex items-center justify-center">
                {step === 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2"
                    onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="size-5" />
                    <span className="sr-only">Back</span>
                  </Button>
                )}
                {step === 1 ? "Create your account" : step === 2 ? "Verify your access" : "Set your password"}
                {step === 3 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="size-5" />
                    <span className="sr-only">Back</span>
                  </Button>
                )}
              </CardTitle>
              <CardDescription className={step === 3 ? "text-center" : ""}>
                {step === 1
                  ? "Start organizing your content empire today"
                  : step === 2
                  ? "Enter your early access code"
                  : "Choose a secure password for your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <form onSubmit={handleContinue}>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => handleSocialLogin("google")}
                        disabled={isLoading}
                      >
                        <svg className="mr-2 size-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => handleSocialLogin("apple")}
                        disabled={isLoading}
                      >
                        <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        Continue with Apple
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="grid gap-2">
                      <Button type="submit" className="w-full">
                        Next
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="underline underline-offset-4">
                      Login
                    </Link>
                  </div>
                </form>
              ) : step === 2 ? (
                <form onSubmit={handleVerifyCode}>
                  <div className="flex flex-col gap-6">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground">
                        Early access code required. Contact Kez if you don't have one.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="verificationCode">Early Access Code</Label>
                      <Input
                        id="verificationCode"
                        type="text"
                        placeholder="Enter early access code"
                        required
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="grid gap-2">
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        Verify Code
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleRequestAccess}
                        disabled={isLoading}
                      >
                        Request Access
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignUp}>
                  <div className="flex flex-col gap-6">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground">
                        Creating account for <span className="font-medium text-foreground">{email}</span>
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter a strong password"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password">Confirm Password</Label>
                      <Input
                        id="repeat-password"
                        type="password"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        placeholder="Re-enter your password"
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="grid gap-2">
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">Access Granted! 🎉</DialogTitle>
            <DialogDescription className="text-base">
              You must know Kez personally to have this early access code.
              <br />
              <br />
              As one of the first users, we'd love your feedback when you test Atlas.
              How much would you be willing to pay monthly for a tool like this?
              <br />
              <br />
              <strong>DM me at @kieranjxn so I can hear your feedback!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                setStep(3)
              }}
              className="w-full"
            >
              Continue to Sign Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
