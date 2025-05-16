import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const eventRouter = createTRPCRouter({
  getAllByUser: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        userCalendarIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.event.findMany({
        where: {
          userId: ctx.session.user.id,
          AND: [
            input.startDate ? { startTime: { gte: input.startDate } } : {},
            input.endDate ? { endTime: { lte: input.endDate } } : {},
            input.userCalendarIds && input.userCalendarIds.length > 0
              ? { userCalendarId: { in: input.userCalendarIds } }
              : {},
          ],
        },
        orderBy: {
          startTime: "asc",
        },
      });
      return events;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        location: z.string().optional(),
        color: z.string().optional().default("bg-blue-500"),
        attendees: z.array(z.string()).optional(),
        userCalendarId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endTime <= input.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time.",
        });
      }

      if (input.userCalendarId) {
        const calendarExists = await ctx.db.userCalendar.findFirst({
          where: { id: input.userCalendarId, userId: ctx.session.user.id },
        });
        if (!calendarExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected calendar not found.",
          });
        }
      } else {
          // If no calendar ID is provided, find or create a default calendar for the user
          let defaultCalendar = await ctx.db.userCalendar.findFirst({
              where: { userId: ctx.session.user.id, name: "My Calendar" } // Or your default name logic
          });
          if (!defaultCalendar) {
              defaultCalendar = await ctx.db.userCalendar.create({
                  data: {
                      name: "My Calendar",
                      userId: ctx.session.user.id,
                      color: "bg-blue-600", // Default color
                      isVisible: true
                  }
              });
          }
          input.userCalendarId = defaultCalendar.id;
      }


      const event = await ctx.db.event.create({
        data: {
          ...input,
          attendees: input.attendees ?? [],
          userId: ctx.session.user.id,
        },
      });
      return event;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        location: z.string().optional().nullable(),
        color: z.string().optional(),
        attendees: z.array(z.string()).optional().nullable(),
        userCalendarId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...dataToUpdate } = input;

      const event = await ctx.db.event.findUnique({ where: { id } });
      if (!event || event.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found or access denied.",
        });
      }

      if (
        dataToUpdate.startTime &&
        dataToUpdate.endTime &&
        dataToUpdate.endTime <= dataToUpdate.startTime
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time.",
        });
      } else if (
        dataToUpdate.startTime &&
        !dataToUpdate.endTime &&
        event.endTime <= dataToUpdate.startTime
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time.",
        });
      } else if (
        !dataToUpdate.startTime &&
        dataToUpdate.endTime &&
        dataToUpdate.endTime <= event.startTime
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time.",
        });
      }

      if (dataToUpdate.userCalendarId) {
        const calendarExists = await ctx.db.userCalendar.findFirst({
          where: {
            id: dataToUpdate.userCalendarId,
            userId: ctx.session.user.id,
          },
        });
        if (!calendarExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected calendar not found.",
          });
        }
      }

      return ctx.db.event.update({
        where: { id },
        data: {
          ...dataToUpdate,
          description:
            dataToUpdate.description === null
              ? undefined // Use undefined to unset if needed, or null based on schema
              : dataToUpdate.description,
          location:
            dataToUpdate.location === null ? undefined : dataToUpdate.location,
          attendees:
            dataToUpdate.attendees === null
              ? undefined
              : (dataToUpdate.attendees ?? undefined),
          userCalendarId:
            dataToUpdate.userCalendarId === null
              ? null
              : dataToUpdate.userCalendarId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({ where: { id: input.id } });
      if (!event || event.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found or access denied.",
        });
      }
      await ctx.db.event.delete({ where: { id: input.id } });
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const query = input.query.trim();
      if (!query) {
        return [];
      }
      
      // Use 'contains' for standard substring search
      const events = await ctx.db.event.findMany({
        where: {
          userId: ctx.session.user.id,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: {
          startTime: "desc",
        },
        take: 15,
      });
      return events;
    }),
});