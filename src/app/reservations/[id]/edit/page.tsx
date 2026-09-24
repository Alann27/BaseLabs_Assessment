import Link from 'next/link'
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReservationForm from "@/features/reservations/create/form";
import { getLocationsAndEquipments } from "@/server/reservations/locations-and-equipments";

const getReservation = async (id: string) => {
  return prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      locationId: true,
      startAt: true,
      endAt: true,
      status: true,
      items: {
        select: { equipmentId: true, quantity: true },
      },
    },
  });
};

export default async function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, { locationNamesById, equipmentsByLocation }] = await Promise.all([
    getReservation(id),
    getLocationsAndEquipments(),
  ]);

  if (!reservation) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Link href={'/'}>
          <Button startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
            Back to reservations
          </Button>
        </Link>
        <Typography component="h1" variant="h1" gutterBottom>
          Edit Reservation
        </Typography>
      </Box>

      <ReservationForm
        locationNameById={locationNamesById}
        equipmentsByLocation={equipmentsByLocation}
        reservation={{
          id: reservation.id,
          location: reservation.locationId,
          startAt: reservation.startAt.toISOString(),
          endAt: reservation.endAt.toISOString(),
          status: reservation.status,
          equipments: reservation.items.map((item) => ({
            id: item.equipmentId,
            quantity: String(item.quantity),
          })),
        }}
      />
    </Stack>
  );
}
