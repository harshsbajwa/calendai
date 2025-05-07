import { authRouter } from "~/server/api/routers/auth";
import { eventRouter } from "~/server/api/routers/event";
import { postRouter } from "~/server/api/routers/post";
import { userCalendarRouter } from "~/server/api/routers/userCalendar";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  event: eventRouter,
  post: postRouter,
  userCalendar: userCalendarRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
