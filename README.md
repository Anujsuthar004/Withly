# Withly

Withly is a private companionship workspace architected specifically to solve the friction of organizing casual, low-stakes hangouts and errands.

Instead of navigating the awkwardness of formal plans, Withly allows users to post highly specific, structured requests. Whether you need an "Errand Companion" to help carry groceries or a "Social Plus-One" to check out a new local spot, Withly prioritizes safety, clear intentions, and verifiable trust.

## Technology Stack

This application is built for extreme edge performance and deep Row Level Security (RLS).
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Vanilla CSS (`globals.css`)
- **Backend**: Supabase Postgres (with RLS)
- **Authentication**: Supabase Auth
- **Realtime**: Supabase Realtime (for private session chat and live notifications)
- **Validation**: Zod & Server Actions

## Core Features

1. **Safety Check-ins**: Active session participants can quickly tap "I'm OK," "Running Late," or "Need Help."
2. **Emergency SOS**: A persistent panic button in chatrooms that securely dispatches your location to a predefined emergency contact.
3. **Progressive Verification**: Users earn Trust badges by verifying their Phone, Government ID, or Institutional Email.
4. **Dynamic Trust Scoring**: An algorithmic (0-100) score that adjusts based on completed sessions, mutual endorsements, and platform behavior.
5. **Ephemeral Requests**: Requests auto-expire based on user-defined times, preventing stale feeds and ensuring immediate discovery.
6. **Group Companionship**: Built-in capacity management allows request creators to cap their events (e.g., "Up to 3 people").
7. **Trust Communities**: Create and join walled-garden networks automatically gated by specific email domains (e.g., `@nyu.edu`).
8. **AI Content Moderation**: Background screening of user-generated content, automatically queuing high-risk flags into an Admin dashboard.
9. **Companion Compatibility**: Feed requests actively parse mutual tags, previous interactions, and safety thresholds to display a % match score.
10. **Availability Windows**: Define your standard recurring free time on your profile for better algorithmic matching.
11. **Meet-Again Network**: Seamlessly build a private roster of trusted companions after positive sessions.
12. **Realtime Notifications**: A bell inbox syncing instantly via Supabase to alert you of join requests and chat messages.

## Security Philosophy 

This project operates on a "Trust No Client" philosophy:
- We rely entirely on Supabase Row Level Security (RLS) instead of application-code trust.
- Public discovery feeds only expose sanitized, aggregated data blocks.
- Real-world identities and granular session details are locked exclusively to matched session participants.
- All mutative server actions go through strict Zod schema parsing before interacting with the database layer.
