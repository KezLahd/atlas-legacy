import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AtlasLogo } from "@/components/atlas-logo"
import { Calendar, TrendingUp, Users, Zap, BarChart3 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <AtlasLogo className="size-8" showText />
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#who" className="text-sm text-muted-foreground hover:text-foreground">
              Who It's For
            </Link>
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
              Login
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 bg-gradient-to-b from-accent/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-balance leading-tight">
            Carry the weight of your <span className="text-accent">brand</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Atlas is the creator-first content operating system for planning, producing, batching, and analyzing your
            personal brand content.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/auth/sign-up">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-muted bg-transparent">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="who" className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Built for creators at every scale</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Whether you're managing your own brand or a team of creators, Atlas adapts to your workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-background rounded-lg p-6 space-y-4 border">
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Solo Creators</h3>
              <p className="text-muted-foreground">
                Organize your content strategy, plan production schedules, and track what's working—all in one place.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 space-y-4 border-2 border-accent/30">
              <div className="size-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Zap className="size-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Creator Managers</h3>
              <p className="text-muted-foreground">
                Manage multiple creators with ease. Assign tasks, track production stages, and collaborate seamlessly.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 space-y-4 border">
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Creative Agencies</h3>
              <p className="text-muted-foreground">
                Scale your operations with workspace management, team roles, and comprehensive analytics across all
                clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need to scale your brand</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From ideation to analytics, Atlas connects your entire content workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="space-y-3 p-6 rounded-lg border bg-card hover:border-primary/40 transition-colors">
              <Calendar className="size-8 text-primary" />
              <h3 className="font-semibold text-lg">Content Planning</h3>
              <p className="text-sm text-muted-foreground">
                Strategic frameworks including pillars, 4Hs, series, and sub-niches linked to human insecurities.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-lg border bg-card hover:border-accent/40 transition-colors">
              <Zap className="size-8 text-accent" />
              <h3 className="font-semibold text-lg">Production Stages</h3>
              <p className="text-sm text-muted-foreground">
                Track content from idea through scripted, approved, shot, edited, scheduled, to posted.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-lg border bg-card hover:border-primary/40 transition-colors">
              <Users className="size-8 text-primary" />
              <h3 className="font-semibold text-lg">Batch Production</h3>
              <p className="text-sm text-muted-foreground">
                Group content into batches for efficient filming and production management.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-lg border bg-card hover:border-accent/40 transition-colors">
              <Calendar className="size-8 text-accent" />
              <h3 className="font-semibold text-lg">Calendar Integration</h3>
              <p className="text-sm text-muted-foreground">
                Sync with Google Calendar, invite team members, and manage production schedules.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-lg border bg-card hover:border-primary/40 transition-colors">
              <TrendingUp className="size-8 text-primary" />
              <h3 className="font-semibold text-lg">Research Library</h3>
              <p className="text-sm text-muted-foreground">
                Deconstruct viral content, analyze what works, and apply insights to your strategy.
              </p>
            </div>
            <div className="space-y-3 p-6 rounded-lg border bg-card hover:border-accent/40 transition-colors">
              <BarChart3 className="size-8 text-accent" />
              <h3 className="font-semibold text-lg">Analytics Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Track performance across platforms with manual entry now, Instagram API integration later.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-accent/5">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to organize your content empire?</h2>
            <p className="text-lg text-muted-foreground">
              Join creators who are scaling their personal brands with Atlas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/auth/sign-up">Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <AtlasLogo className="size-6" showText />
            <p className="text-sm text-muted-foreground">© 2026 Atlas. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
