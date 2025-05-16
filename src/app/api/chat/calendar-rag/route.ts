import {
  streamText,
  type CoreMessage,
  type Message as VercelUIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { format } from "date-fns-tz";
import { type NextRequest } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";
import { LRUCache } from "lru-cache";

type Event = {
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  attendees?: string[] | null;
  recurrence?: string | null;
  description?: string | null;
};

type ChatRequestBody = {
  messages: VercelUIMessage[];
  timezone?: string;
};

const cache = new LRUCache<string, string>({ max: 100, ttl: 5 * 60 * 1000 });

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const openRouterModule = openrouter.chat(
  "meta-llama/llama-3.3-8b-instruct:free",
);

function convertToCoreMessages(messages: VercelUIMessage[]): CoreMessage[] {
  const validMessages: CoreMessage[] = [];

  for (const message of messages) {
    // Ensure content is a plain string (not parts, files, etc.)
    if (typeof message.content !== "string" || !message.content.trim())
      continue;

    const trimmedContent = message.content.trim();

    if (
      message.role === "user" ||
      message.role === "assistant" ||
      message.role === "system"
    ) {
      validMessages.push({ role: message.role, content: trimmedContent });
    } else {
      console.warn(
        `Unhandled message role "${message.role}", treating as user.`,
      );
      validMessages.push({
        role: "user",
        content: `${message.role}: ${trimmedContent}`,
      });
    }
  }
  return validMessages;
}

function buildSystemPrompt(eventsText: string, tz: string): string {
  const now = new Date();
  const today = format(now, "EEEE, MMMM d, yyyy", { timeZone: tz });

  return `You are CalendAI, a helpful assistant for calendar tasks.
    You always answer based on the provided events.
    If no relevant events are found, state this clearly and helpfully.

    Assume the user's timezone is "${tz}". Today is ${today}. Prioritize event dates when answering.

    Here are the events:

    ${eventsText}`;
}

function renderEvents(events: Event[], timezone: string): string {
  return events
    .map((event) => {
      return `Event: ${event.title}
Date: ${format(event.startTime, "EEEE, MMM d, yyyy", { timeZone: timezone })}
Time: ${format(event.startTime, "p", { timeZone: timezone })} - ${format(event.endTime, "p", { timeZone: timezone })}
Location: ${event.location ?? "Not specified"}
Attendees: ${event.attendees?.join(", ") ?? "Not specified"}
Recurrence: ${event.recurrence ?? "None"}
Description: ${event.description ?? "None"}`;
    })
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = (await req.json()) as ChatRequestBody;
    const { messages, timezone = "UTC" } = body;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
      });
    }

    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(now.getDate() + 7);

    const userEvents = await db.event.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { startTime: { gte: now, lte: weekFromNow } },
          { endTime: { gte: now, lte: weekFromNow } },
          { startTime: { lte: now }, endTime: { gte: weekFromNow } },
        ],
      },
      orderBy: { startTime: "asc" },
      take: 15,
    });

    const typedEvents = userEvents as Event[];

    const cacheKey = `${session.user.id}:${timezone}`;
    let promptContext = cache.get(cacheKey);

    if (!promptContext) {
      promptContext =
        typedEvents.length > 0
          ? renderEvents(typedEvents, timezone)
          : "You currently have no events in the next 7 days.";
      cache.set(cacheKey, promptContext);
    }

    const coreMessages: CoreMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(promptContext, timezone),
      },
      ...convertToCoreMessages(messages),
    ];

    const result = streamText({
      model: openRouterModule,
      messages: coreMessages,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (err: unknown) {
    console.error("Error in calendar-rag POST:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error occurred.";

    const statusCode = (err as { status?: number })?.status ?? 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}
