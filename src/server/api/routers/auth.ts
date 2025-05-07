import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  getSecretMessage: protectedProcedure.query(({ ctx }) => {
    return `Hello ${ctx.session.user.name ?? ctx.session.user.id}, you can now see this secret message!`;
  }),
});
