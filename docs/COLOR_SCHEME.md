# Atlas Content OS - Color Scheme Documentation

## Current Theme: "about a boy"

### Color Palette

#### Primary Colors
- **Primary**: `#3a2415` (Dark Brown)
  - Used for: Main branding, selected states, primary actions
  - CSS Variable: `--color-primary`
  
- **Primary Foreground**: `#ffffff` (White)
  - Used for: Text on primary colored backgrounds
  - CSS Variable: `--color-primary-foreground`

#### Secondary Colors
- **Secondary**: `#ebe7df` (Light Beige/Cream)
  - Used for: Secondary buttons, alternate backgrounds
  - CSS Variable: `--color-secondary`
  
- **Secondary Foreground**: `#1a1a1a` (Near Black)
  - Used for: Text on secondary colored backgrounds
  - CSS Variable: `--color-secondary-foreground`

#### Accent Colors
- **Accent**: `#89cff0` (Baby Blue)
  - Used for: Highlights, focus states, interactive elements
  - CSS Variable: `--color-accent`
  
- **Accent Foreground**: `#1a1a1a` (Near Black)
  - Used for: Text on accent colored backgrounds
  - CSS Variable: `--color-accent-foreground`
  
- **Ring**: `#89cff0` (Baby Blue)
  - Used for: Focus rings around interactive elements
  - CSS Variable: `--color-ring`

#### Background Colors
- **Background**: `#faf7f2` (Off-White Cream)
  - Used for: Main page background
  - CSS Variable: `--color-background`
  
- **Foreground**: `#1a1a1a` (Near Black)
  - Used for: Main text color
  - CSS Variable: `--color-foreground`
  
- **Card**: `#ffffff` (Pure White)
  - Used for: Card backgrounds
  - CSS Variable: `--color-card`
  
- **Card Foreground**: `#1a1a1a` (Near Black)
  - Used for: Text on card backgrounds
  - CSS Variable: `--color-card-foreground`

#### Utility Colors
- **Muted**: `#ebe7df` (Light Beige)
  - Used for: Subtle backgrounds, disabled states
  - CSS Variable: `--color-muted`
  
- **Muted Foreground**: `#737373` (Gray)
  - Used for: Secondary text, descriptions
  - CSS Variable: `--color-muted-foreground`
  
- **Border**: `#d9d4ca` (Light Brown-Gray)
  - Used for: Borders, dividers
  - CSS Variable: `--color-border`
  
- **Input**: `#ede8df` (Light Cream)
  - Used for: Input field backgrounds
  - CSS Variable: `--color-input`

#### Destructive Colors
- **Destructive**: `#ef4444` (Red)
  - Used for: Error states, delete buttons
  - CSS Variable: `--color-destructive`
  
- **Destructive Foreground**: `#ffffff` (White)
  - Used for: Text on destructive colored backgrounds
  - CSS Variable: `--color-destructive-foreground`

---

## Theme: "what about the girl?"

This theme variant swaps the blue accent color for pink while maintaining all other colors.

### Changed Colors
- **Accent**: `#ffc0cb` (Baby Pink) - replaces `#89cff0`
- **Ring**: `#ffc0cb` (Baby Pink) - replaces `#89cff0`

All other colors remain the same as "about a boy" theme.

---

## Dark Mode Colors

The application supports dark mode with the following adjustments:

- **Background**: `#1a1510` (Very Dark Brown)
- **Foreground**: `#fafafa` (Off-White)
- **Card**: `#2a241e` (Dark Brown)
- **Primary**: `#8b6239` (Lighter Brown for visibility)
- **Secondary**: `#3a342d` (Dark Gray-Brown)
- **Muted**: `#3a342d` (Dark Gray-Brown)
- **Border**: `#3a342d` (Dark Gray-Brown)
- **Input**: `#3a342d` (Dark Gray-Brown)

---

## Usage in Components

### Applying Theme Colors

Colors are applied using Tailwind CSS utility classes that reference the CSS variables:

\`\`\`tsx
// Primary color
<Button className="bg-primary text-primary-foreground">Primary</Button>

// Secondary color
<Button variant="secondary">Secondary</Button>

// Accent color
<div className="border-accent ring-accent">Accented Element</div>

// Background colors
<div className="bg-background text-foreground">
  <Card className="bg-card text-card-foreground">Card Content</Card>
</div>
\`\`\`

### Theme Switching

Users can switch between themes in the Account Settings page (`/profile/account`). The theme preference is:
1. Saved to the `user_profiles.theme_preset` column in the database
2. Applied dynamically by updating CSS custom properties
3. Persisted across sessions

### Adding New Themes

To add a new theme preset:

1. Add the theme option to the Account Settings page UI
2. Define color overrides in the `applyTheme()` function
3. Update the `theme_preset` column validation if needed
4. Consider adding the theme to this documentation

---

## File Locations

- **Global Styles**: `app/globals.css` - Contains all CSS custom property definitions
- **Theme Toggle**: `app/profile/account/page.tsx` - User-facing theme selector
- **Database Schema**: `scripts/028_add_theme_preset.sql` - Theme preference storage
\`\`\`

\`\`\`tsx file="" isHidden
