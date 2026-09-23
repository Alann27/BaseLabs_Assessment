import { z } from "zod";

export type ReservationFormValues = z.infer<typeof ReservationFormSchema>;
export type ReservationValues = z.infer<typeof ReservationSchema>;

const requiredError = { error: "Required" };
const invalidDateError = { error: "Must be a valid date" };

const dateFromString = z
  .string(requiredError)
  .nonempty(requiredError)
  .transform((value) => new Date(value))
  .pipe(z.date(invalidDateError));

const baseReservationFormSchema = z.object({
  location: z.string(requiredError).nonempty(requiredError),
  status: z.enum(["DRAFT", "CONFIRMED"]).nonoptional(requiredError),
});

export const ReservationFormSchema = baseReservationFormSchema
  .safeExtend({
    startAt: z.date(requiredError),
    endAt: z.date(requiredError),
    equipments: z.array(
      z.object({
        id: z.string(requiredError).nonempty(requiredError),
        quantity: z
          .string(requiredError)
          .nonempty(requiredError)
          .transform((value) => parseInt(value, 10))
          .pipe(z.number().int().positive()),
      }),
    ),
  })
  .refine((input) => input.endAt > input.startAt, {
    message: "End date must be after the start date.",
    path: ["endAt"],
  });

export const ReservationSchema = baseReservationFormSchema
  .safeExtend({
    startAt: dateFromString,
    endAt: dateFromString,
    equipments: z.array(
      z.object({
        id: z.string(requiredError).nonempty(requiredError),
        quantity: z.number().int().positive(),
      }),
    ),
  })
  .refine((input) => input.endAt > input.startAt, {
    message: "End date must be after the start date.",
    path: ["endAt"],
  })
  .refine((input) => input.startAt >= new Date(), {
    message: "Start date must not be in the past.",
    path: ["startAt"],
  });
