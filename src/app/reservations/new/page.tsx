import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Stack, Typography } from "@mui/material";
import { getLocationsAndEquipments } from "@/server/reservations/locations-and-equipments";
import ReservationForm from "@/features/reservations/create/form";

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

      <ReservationForm
        locationNameById={locationNamesById}
        equipmentsByLocation={equipmentsByLocation}
      />
    </Stack>
  );
}
