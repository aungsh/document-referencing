# GymNag UI Design System

This document outlines the design philosophy, packages, fonts, and specific Tailwind/CSS styles used to build the GymNag user interface. AI agents can reference this to replicate the exact aesthetic in other projects.

## Core Philosophy

1. **Dark Mode First**: The application is forced into dark mode using `<html class="dark">` and specific CSS variables overriding the default shadcn/ui light theme.
2. **Typography Over Cards**: Avoid floating cards, shadows, and heavy borders. Use typography (font size, weight, tracking, casing) and horizontal lines (`<Separator />`) to establish visual hierarchy.
3. **No Gradients, No Em-Dashes**: Flat, solid colors only. Em-dashes are removed in favor of clean spacing or standard hyphens.
4. **Monochrome + One Accent**: The palette is strictly black, white, and grays, with exactly one vibrant accent color (Lime Green) used sparingly for primary calls to action or success states.

## Packages

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4
- **Components**: `shadcn/ui` (specifically `button`, `input`, `separator`, `badge`)
- **Fonts**: `next/font/google` (Geist Sans and Geist Mono)

## Typography Setup

We use **Geist** and **Geist Mono** for a highly technical, modern look.
Configured in `app/layout.tsx`:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// In the HTML tag:
<html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
```

## CSS Variables (`app/globals.css`)

The dark mode is forced by setting all root variables to dark-equivalent `oklch` values.
The accent color is a custom vibrant lime green.

```css
@theme inline {
  --color-background: oklch(0.08 0 0); /* Near black */
  --color-foreground: oklch(0.98 0 0); /* Pure white */
  
  --color-muted: oklch(0.15 0 0);
  --color-muted-foreground: oklch(0.65 0 0);

  --color-accent: oklch(0.87 0.22 130); /* Lime Green */
  --color-accent-foreground: oklch(0.08 0 0); /* Near black for text on accent */
  
  --color-destructive: oklch(0.6 0.2 20); /* Red */
  
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

## Common UI Patterns

### Layout Centering
For wide screens, constrain the width to `max-w-5xl` and center it:
```tsx
<main className="flex-1 px-6 md:px-12 pb-24 max-w-5xl mx-auto w-full">
  ...
</main>
```

### Section Headings
Use the monospace font, small text, and wide letter spacing for section subheadings, followed by a bottom margin.
```tsx
<h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-8">
  How it works
</h2>
```

### Large Typography (Hero)
Extremely large, bold, tightly tracked headings.
```tsx
<h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
  Stop skipping.<br />Get nagged.
</h1>
```

### Primary Buttons (CTAs)
Because shadcn's default button relies on `--primary`, but our accent is `--accent`, we use raw `<button>` elements with inline style overrides or explicitly apply `bg-accent text-accent-foreground` to ensure the vibrant color punches through.
```tsx
<button
  className="px-4 h-10 rounded-lg text-sm font-semibold transition-opacity cursor-pointer"
  style={{ background: 'oklch(0.87 0.22 130)', color: 'oklch(0.08 0 0)' }}
>
  Get link
</button>
```

### GitHub-Style Contribution Calendar
Built manually using raw `<div>` grid elements to avoid heavy charting libraries.
- **Size**: 52 weeks long, dots are `w-[12px] h-[12px]` with `rounded-[2px]` (squarish).
- **Colors**: 
  - `bg-accent` (Green) for completed.
  - `bg-destructive/70` (Red) for failed/skipped.
  - `bg-muted/30` for past inactivity.
  - `bg-muted/10` for future days.
- **Scroll**: Wrapped in a `overflow-x-auto` container with a `useRef` to auto-scroll right (`scrollLeft = scrollWidth`) on mount to show the most recent days first.
