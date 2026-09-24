import { NextRequest, NextResponse } from "next/server";

import { DomainError } from "@/lib/domain-error";
import { ReservationSchema } from "@/schemas/create-reservation";
import { checkAvailability } from "@/server/reservations/availability";
import { updateReservation } from "@/server/reservations/update-reservation";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = ReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request.",
          code: "VALIDATION_ERROR",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join(".") || null,
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const availabilityByEquipment = await checkAvailability({
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      equipments: parsed.data.equipments,
      locationId: parsed.data.location,
      excludeReservationId: id,
    });

    const equipmentsWithoutAvailability = availabilityByEquipment.filter(
      (equipment) => !equipment.available,
    );

    if (equipmentsWithoutAvailability.length > 0) {
      return NextResponse.json(
        {
          error:
            "One or more items are not available at the selected time. Please select another time or change the equipment.",
          code: "NO_AVAILABILITY",
          data: equipmentsWithoutAvailability,
        },
        {
          status: 400,
        },
      );
    }

    const { items, reservation } = await updateReservation(id, parsed.data);

    return NextResponse.json({ items, reservation });
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON.", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    console.error("Unexpected update reservation error", error);
    return NextResponse.json(
      { error: "The reservation could not be saved. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
