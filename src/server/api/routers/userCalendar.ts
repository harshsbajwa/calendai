import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userCalendarRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.userCalendar.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Calendar name cannot be empty."),
        color: z
          .string()
          .regex(/^bg-(?:[a-z]+)-(?:[0-9]{2,3})$/, "Invalid color format."), // Basic check for "bg-color-shade"
        isVisible: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingCalendar = await ctx.db.userCalendar.findFirst({
        where: { userId: ctx.session.user.id, name: input.name },
      });
      if (existingCalendar) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A calendar with this name already exists.",
        });
      }
      return ctx.db.userCalendar.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Calendar name cannot be empty.").optional(),
        color: z
          .string()
          .regex(/^bg-(?:[a-z]+)-(?:[0-9]{2,3})$/, "Invalid color format.")
          .optional(),
        isVisible: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...dataToUpdate } = input;
      const calendar = await ctx.db.userCalendar.findUnique({ where: { id } });
      if (!calendar || calendar.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar not found or access denied.",
        });
      }

      if (dataToUpdate.name && dataToUpdate.name !== calendar.name) {
        const existingCalendar = await ctx.db.userCalendar.findFirst({
          where: {
            userId: ctx.session.user.id,
            name: dataToUpdate.name,
            id: { not: id },
          },
        });
        if (existingCalendar) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A calendar with this name already exists.",
          });
        }
      }

      return ctx.db.userCalendar.update({
        where: { id },
        data: dataToUpdate,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const calendar = await ctx.db.userCalendar.findUnique({
        where: { id: input.id },
      });
      if (!calendar || calendar.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar not found or access denied.",
        });
      }
      return ctx.db.userCalendar.delete({ where: { id: input.id } });
    }),
});
