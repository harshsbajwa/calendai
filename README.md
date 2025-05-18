# Calendai ✨

**Organize your life, beautifully. Calendai is an intelligent calendar application designed to bring clarity and insight to your schedule, powered by AI.**

# ![Preview](https://github.com/harshsbajwa/calendai/blob/68e1dbb37b4cf30bc228daf8352603bb8beac9c7/public/screenshot.png)

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

## Key Features

Calendai offers a comprehensive suite of features to manage your schedule effectively:

*   📅 **Interactive Calendar Views**: Seamlessly switch between Day, Week, and Month views to visualize your schedule.
*   📝 **Full Event Management**: Create, view, edit, and delete events with details like title, description, location, custom color tags, and attendees.
*   🎨 **Customizable User Calendars**: Manage multiple personal calendars, each with a unique name, color, and visibility setting.
*   🤖 **AI Chat Assistant ("CalendAI")**:
    *   Engage in natural language conversations about your upcoming events.
    *   Utilizes Retrieval Augmented Generation (RAG) with your calendar data to provide relevant answers.
    *   Powered by OpenRouter for access to advanced LLMs (e.g., Llama 3.3 8B Instruct).
*   ⚡ **Command Palette**: Quickly search for events using a `Cmd/Ctrl + K` interface.
*   📱 **Responsive Design**: Enjoy a consistent experience across desktop and mobile devices.
*   🌓 **Themeable Interface**: Switch between Light and Dark modes for your viewing comfort.
*   📐 **Resizable Panels**: Customize your workspace by adjusting the width of the sidebar and AI chat panel.
*   🔐 **Secure Authentication**: Sign in easily and securely using Google or Discord.
*   🚀 **Modern UI/UX**: Built with shadcn/ui for a clean, accessible, and modern user interface.

## Tech Stack

Calendai is built with a modern, robust, and type-safe technology stack:

*   **Framework**: [Next.js](https://nextjs.org/) 15 (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
*   **API & Data Fetching**: [tRPC](https://trpc.io/) with [React Query](https://tanstack.com/query/latest)
*   **Database ORM**: [Prisma](https://prisma.io/)
*   **Database**: [PostgreSQL](https://www.postgresql.org/) through [Supabase](https://supabase.com/)
*   **Authentication**: [Auth.js](https://auth.js.org/) (v5) - Google & Discord providers
*   **AI Integration**:
    *   [OpenRouter](https://openrouter.ai/) via `@openrouter/ai-sdk-provider`
    *   [Vercel AI SDK](https://sdk.vercel.ai/) for streaming chat responses
*   **Linting & Formatting**: ESLint, Prettier
*   **Package Manager**: [pnpm](https://pnpm.io/)

## Project Structure

A brief overview of the key directories:

*   `prisma/`: Contains Prisma schema (`schema.prisma`) and database migrations.
*   `src/app/`: Next.js App Router pages and layouts.
    *   `calendar/`: Core logic and UI for the calendar application.
        *   `components/`: Calendar-specific React components (views, dialogs, sidebar).
        *   `hooks/`: Custom React hooks for calendar functionality.
        *   `utils/`: Utility functions specific to the calendar.
    *   `api/`: API route handlers (NextAuth, tRPC, OpenRouter, Auth).
*   `src/components/ui/`: Reusable UI components, largely based on shadcn/ui.
*   `src/lib/`: General utility functions.
*   `src/server/`: Server-side logic.
    *   `api/`: tRPC routers, procedures, and context.
    *   `auth/`: NextAuth.js configuration.
    *   `db.ts`: Prisma client initialization.
*   `src/styles/`: Global CSS styles and Tailwind CSS setup.
*   `src/theme/`: Theme provider for light/dark mode.
*   `src/trpc/`: tRPC client setup for React.

---

Happy Scheduling with Calendai!
