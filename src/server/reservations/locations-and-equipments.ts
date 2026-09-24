import { prisma } from "@/lib/prisma";

interface LocationEquipment {
  id: string;
  name: string;
  totalQuantity: number;
  locationName: string;
  locationId: string;
}

export async function getLocationsAndEquipments() {
  const equipmentsAndLocations = await prisma.equipment.findMany({
    include: { location: true },
  });

  const locationNamesById: Record<string, string> = {};

  const equipmentsByLocation: Record<
    string,
    Array<LocationEquipment>
  > = equipmentsAndLocations.reduce(
    (map, item) => {
      if (!locationNamesById[item.locationId]) {
        locationNamesById[item.locationId] = item.location?.name || item.locationId;
      }

      if (!map[item.locationId]) {
        map[item.locationId] = [];
      }

      map[item.locationId].push({
        id: item.id,
        name: item.name,
        totalQuantity: item.totalQuantity,
        locationName: item.location?.name || "",
        locationId: item.locationId,
      });

      return map;
    },
    {} as Record<string, Array<LocationEquipment>>,
  );

  return {
    locationNamesById,
    equipmentsByLocation,
  };
}
