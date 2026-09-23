import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Stack, Typography } from "@mui/material";
import { prisma } from '@/lib/prisma'
import CreateReservationForm from '@/features/reservations/create/form'

interface ReservationFormValues {
  id: string,
  name: string,
  totalQuantity: number,
  locationName: string,
  locationId: string,
}

const getLocationsAndEquipments = async () => {
  const equipmentsAndLocations = await prisma.equipment.findMany({
    include: { location: true },
  })

  const locationNamesById: Record<string, string> = {}

  const equipmentsByLocation: Record<string, Array<ReservationFormValues>> = equipmentsAndLocations.reduce((map, item) => {
    if (!locationNamesById[item.locationId]) {
      locationNamesById[item.locationId] = item.location?.name || item.locationId
    }

    if (!map[item.locationId]) {
      map[item.locationId] = []
    }

    map[item.locationId].push({
      id: item.id,
      name: item.name,
      totalQuantity: item.totalQuantity,
      locationName: item.location?.name || '',
      locationId: item.locationId,
    })

    return map
  }, {} as Record<string, Array<ReservationFormValues>>)

  return {
    locationNamesById,
    equipmentsByLocation,
  }
}

export default async function NewReservationPage() {
  const { locationNamesById, equipmentsByLocation } = await getLocationsAndEquipments();

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          New Reservation
        </Typography>
      </Box>

      <CreateReservationForm
        locationNameById={locationNamesById}
        equipmentsByLocation={equipmentsByLocation}
      />
    </Stack>
  );
}
