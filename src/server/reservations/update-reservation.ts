import { prisma } from "@/lib/prisma";
import { ReservationValues } from "@/schemas/create-reservation";
import { DomainError } from "@/lib/domain-error";

export async function updateReservation(id: string, data: ReservationValues) {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!reservation) {
      throw new DomainError("Reservation not found.", 404, "RESERVATION_NOT_FOUND");
    }

    const updatedReservation = await tx.reservation.update({
      where: { id },
      data: {
        locationId: data.location,
        startAt: data.startAt,
        endAt: data.endAt,
        status: data.status,
      },
    });

    await tx.reservationItem.deleteMany({ where: { reservationId: id } });

    const items = await tx.reservationItem.createManyAndReturn({
      data: data.equipments.map((item) => ({
        reservationId: updatedReservation.id,
        equipmentId: item.id,
        quantity: item.quantity,
      })),
    });

    return {
      reservation: updatedReservation,
      items,
    };
  });
}
