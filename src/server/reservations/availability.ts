import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";

interface AvailabilityInput {
  locationId: string;
  equipments: Array<{
    id: string;
    quantity: number;
  }>;
  startAt: Date;
  endAt: Date;
  excludeReservationId?: string;
}

interface AvailableQuantity {
  id: string;
  availableQuantity: number;
}

interface AvailableQuantityWithAvailability extends AvailableQuantity {
  available: boolean;
}

interface GetPeakParam {
  equipmentId: string
  quantity: number
  reservation: {
    startAt: Date
    endAt: Date
  }
}

function getPeak(reservationsList: Array<GetPeakParam>) {
  const eventsOfReservation = reservationsList.map(reservation => [
    {
      date: reservation.reservation.startAt,
      quantity: reservation.quantity,
    },
    {
      date: reservation.reservation.endAt,
      quantity: -reservation.quantity,
    }
  ])
    .flat()
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.quantity - b.quantity)

  let peak = 0, reserved = 0

  for (const event of eventsOfReservation) {
    reserved += event.quantity

    peak = Math.max(peak, reserved)
  }

  return peak
}

export async function getAvailableQuantity(
  input: AvailabilityInput,
): Promise<Array<AvailableQuantity>> {
  if (input.startAt >= input.endAt) {
    throw new DomainError("End time must be after start time.", 400, "INVALID_INTERVAL");
  }

  const equipmentIds = input.equipments.map((equipment) => equipment.id);

  const equipmentQuantities = await prisma.equipment.findMany({
    where: { id: { in: equipmentIds }, locationId: input.locationId },
    select: { totalQuantity: true, id: true },
    take: input.equipments.length,
  });

  if (equipmentQuantities.length < input.equipments.length) {
    throw new DomainError(
      "Some equipment was not found at the selected location.",
      404,
      "EQUIPMENT_NOT_FOUND",
    );
  }

  const reservations = await prisma.reservationItem.findMany({
    where: {
      reservation: {
        locationId: input.locationId,
        status: "CONFIRMED",
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
        ...(input.excludeReservationId ? { id: { not: input.excludeReservationId } } : {}),
      },
      equipmentId: { in: equipmentIds },
    },
    select: {
      equipmentId: true,
      quantity: true,
      reservation: {
        select: {
          startAt: true,
          endAt: true,
        }
      }
    }
  });

  const reservationsByEquipment: Record<string, typeof reservations> = reservations.reduce((map, item) => {
    const currentArray = map[item.equipmentId] || []
    currentArray.push(item)
    map[item.equipmentId] = currentArray

    return map
  }, {} as Record<string, typeof reservations>)

  return equipmentQuantities.map((equipment) => ({
    id: equipment.id,
    availableQuantity: Math.max(
      0,
      equipment.totalQuantity - getPeak(reservationsByEquipment[equipment.id] || []),
    ),
  }));
}

export async function checkAvailability(
  input: AvailabilityInput,
): Promise<Array<AvailableQuantityWithAvailability>> {
  const requestedQuantityByEquipment: Record<string, number> = {};

  if (input.equipments.length === 0) {
    throw new DomainError("At least one equipment item must be provided.", 400, "NO_EQUIPMENT");
  }

  for (const equipment of input.equipments) {
    if (!Number.isInteger(equipment.quantity) || equipment.quantity <= 0) {
      throw new DomainError("Quantity must be a positive whole number.", 400, "INVALID_QUANTITY");
    }

    if (requestedQuantityByEquipment[equipment.id] !== undefined) {
      throw new DomainError(
        "Each equipment can only be selected once.",
        400,
        "DUPLICATE_EQUIPMENT",
      );
    }

    requestedQuantityByEquipment[equipment.id] = equipment.quantity;
  }

  const availableQuantities = await getAvailableQuantity(input);

  return availableQuantities.map((availableQuantity) => ({
    ...availableQuantity,
    available:
      availableQuantity.availableQuantity >= requestedQuantityByEquipment[availableQuantity.id],
  }));
}
