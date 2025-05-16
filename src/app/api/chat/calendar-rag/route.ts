import {
  streamText,
  type CoreMessage,
  type Message as VercelUIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const openRouterModule = openrouter.chat(
  "meta-llama/llama-3.3-8b-instruct:free",
);

const convertToCoreMessages = (messages: VercelUIMessage[]): CoreMessage[] => {
  const coreMessages: CoreMessage[] = [];

  for (const message of messages) {
    let coreMsg: CoreMessage | null = null;
    switch (message.role) {
      case "user":
        coreMsg = { role: "user", content: message.content };
        break;
      case "assistant":
        coreMsg = { role: "assistant", content: message.content };
        break;
      case "system":
        coreMsg = { role: "system", content: message.content };
        break;
      default:
        const unhandledRole = message.role as string;
        if (unhandledRole && message.content) {
          console.warn(
            `Unhandled message role "${unhandledRole}" in history. Treating as user message.`,
          );
          coreMsg = {
            role: "user",
            content: `${unhandledRole}: ${message.content}`,
          };
        }
    }

    if (coreMsg) {
      if (
        typeof coreMsg.content === "string" &&
        coreMsg.content.trim() === ""
      ) {
        // skip
      } else if (
        Array.isArray(coreMsg.content) &&
        coreMsg.content.length === 0
      ) {
        // skip
      } else {
        coreMessages.push(coreMsg);
      }
    }
  }
  return coreMessages;
};

const RAG_PROMPT_SYSTEM_MESSAGE_CONTENT = (
  eventContext: string,
): string => `You are CalendAI, a friendly and insightful AI assistant specialized in helping users manage and understand their calendar.
Your goal is to answer questions about the user's calendar events based on the provided context.
If the information is not in the context or if the context is empty, politely state that you don't have that specific information or that there are no relevant events in the provided context.
Be conversational and helpful. Use today's date: ${format(new Date(), "EEEE, MMMM d, yyyy")} to orient yourself if needed for relative date questions (like "tomorrow"), but always prioritize the event dates from the context.

Here is the relevant calendar event context:
${eventContext}`;

interface ChatRequestBody {
  messages: VercelUIMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const requestBody = (await req.json()) as ChatRequestBody;
    const { messages: vercelMessages } = requestBody;

    if (!vercelMessages || vercelMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);

    const userEvents = await db.event.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { startTime: { gte: startDate, lte: endDate } },
          { endTime: { gte: startDate, lte: endDate } },
          {
            AND: [
              { startTime: { lte: startDate } },
              { endTime: { gte: endDate } },
            ],
          },
        ],
      },
      orderBy: { startTime: "asc" },
      take: 15,
    });

    const formattedEvents = userEvents
      .map(
        (event) =>
          `Event: ${event.title}\nDate: ${format(event.startTime, "EEEE, MMM d, yyyy")}\nTime: ${format(event.startTime, "p")} to ${format(event.endTime, "p")}\nLocation: ${event.location ?? "Not specified"}\nDescription: ${event.description ?? "None"}`,
      )
      .join("\n\n---\n\n");

    const event_context_for_prompt =
      userEvents.length > 0
        ? `${formattedEvents}`
        : "You currently have no events in the upcoming 7 days to discuss.";

    const coreMessagesForStream: CoreMessage[] = [
      {
        role: "system",
        content: RAG_PROMPT_SYSTEM_MESSAGE_CONTENT(event_context_for_prompt),
      },
      ...convertToCoreMessages(vercelMessages),
    ];

    const result = streamText({
      model: openRouterModule,
      messages: coreMessagesForStream,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (e: unknown) {
    console.error("Error in RAG API route:", e);
    let errorMessage = "An error occurred processing your request.";
    let statusCode = 500;

    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === "string") {
      errorMessage = e;
    }

    if (
      e &&
      typeof e === "object" &&
      "cause" in e &&
      e.cause &&
      typeof e.cause === "object" &&
      "message" in e.cause
    ) {
      const causeMessage = (e.cause as { message?: unknown }).message;
      if (typeof causeMessage === "string") {
        errorMessage = `${errorMessage} Cause: ${causeMessage}`;
      }
    }

    if (
      e &&
      typeof e === "object" &&
      "status" in e &&
      typeof e.status === "number"
    ) {
      statusCode = e.status;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}