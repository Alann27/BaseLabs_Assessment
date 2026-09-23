import { prisma } from "@/lib/prisma";
import { ReservationValues } from "@/schemas/create-reservation";

export async function createReservation(data: ReservationValues) {
  return await prisma.$transaction(async (tx) => {
    const createdReservation = await tx.reservation.create({
      data: {
        locationId: data.location,
        startAt: data.startAt,
        endAt: data.endAt,
        createdAt: new Date(),
        status: data.status,
      },
    });

    const items = await tx.reservationItem.createManyAndReturn({
      data: data.equipments.map((item) => ({
        reservationId: createdReservation.id,
        equipmentId: item.id,
        quantity: item.quantity,
      })),
    });

    return {
      reservation: createdReservation,
      items,
    };
  });
}
