"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import Check from "@mui/icons-material/Check";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMutation } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";

import DateRange from "@/features/reservations/create/date-range";
import Equipments from "@/features/reservations/create/equipments";
import LocationSelect from "@/features/reservations/create/location";
import StatusSelect from "@/features/reservations/create/status";
import { NoAvailabilityError } from "@/lib/no-availability-error";
import { ReservationFormSchema, ReservationFormValues } from "@/schemas/create-reservation";

interface CreateReservationFormProps {
  locationNameById: Record<string, string>;
  equipmentsByLocation: Record<string, Array<{ id: string; name: string; totalQuantity: number }>>;
}

export default function CreateReservationForm(props: CreateReservationFormProps) {
  const { status, isPending, isError, error, mutate, reset } = useMutation({
    mutationFn: async (data: ReservationFormValues) => {
      const response = await fetch("/api/reservations", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.code === "NO_AVAILABILITY") {
          throw new NoAvailabilityError(
            "The selected equipment is not available.",
            "NO_AVAILABILITY",
            errorData.data,
          );
        }

        throw new Error("Something went wrong");
      }

      return response.json();
    },
  });

  const methods = useForm({
    resolver: zodResolver(ReservationFormSchema),
    defaultValues: {
      location: "",
      equipments: [{ id: "", quantity: "" }],
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      status: "",
    },
    reValidateMode: "onChange",
  });

  const onSubmit = (data: ReservationFormValues) => {
    if (status === "pending" || status === "success") return;

    mutate(data);
  };

  if (isPending) {
    return (
      <Card
        elevation={3}
        component={"form"}
        sx={{
          p: 3,
          height: 465,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress size={80} />
        <Typography variant={"h6"} sx={{ mt: 3 }}>
          Creating reservation...
        </Typography>
      </Card>
    );
  }

  const isAvailabilityError = error ? error instanceof NoAvailabilityError : false;

  if (isError && !isAvailabilityError) {
    return (
      <Card
        elevation={3}
        onSubmit={methods.handleSubmit(onSubmit)}
        component={"form"}
        sx={{
          p: 3,
          height: 465,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant={"h6"}>The reservation could not be saved.</Typography>
        <Stack
          spacing={2}
          sx={{
            mt: 2,
            mb: -1,
            justifyContent: "flex-end",
            alignItems: "center",
            "& button,a": { width: { xs: "100%", sm: "auto" } },
          }}
          direction={"row"}
        >
          <Link href={"/"}>
            <Button variant={"outlined"}>Cancel</Button>
          </Link>
          <Button variant={"contained"} type={"submit"}>
            Try Again
          </Button>
        </Stack>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card
        elevation={3}
        onSubmit={methods.handleSubmit(onSubmit)}
        component={"form"}
        sx={{
          p: 3,
          height: 465,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Check color={"success"} sx={{ fontSize: 80 }} />
        <Typography variant={"h6"}>Reservation saved successfully!</Typography>
        <Stack
          spacing={2}
          sx={{
            mt: 2,
            mb: -1,
            justifyContent: "flex-end",
            alignItems: "center",
            "& button,a": { width: { xs: "100%", sm: "auto" } },
          }}
          direction={"row"}
        >
          <Link href={"/"}>
            <Button variant={"outlined"}>Go Home</Button>
          </Link>
          <Button
            onClick={() => {
              methods.reset();
              reset();
            }}
            variant={"contained"}
          >
            Create New Reservation
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <FormProvider {...methods}>
      <Card
        elevation={3}
        component={"form"}
        sx={{ p: 3 }}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <Stack spacing={2} direction={{ xs: "column", md: "row" }} sx={{ width: "100%" }}>
          <LocationSelect locationNameById={props.locationNameById} resetMutation={reset} />
          <Divider sx={{ mx: 2 }} flexItem />
          <DateRange />
        </Stack>
        <Divider sx={{ mt: 1, mb: 2 }} />
        <Equipments
          equipmentsByLocation={props.equipmentsByLocation}
          equipmentsWithNoAvailability={error instanceof NoAvailabilityError ? error.data : null}
          resetMutation={reset}
        />
        <Divider sx={{ my: 2 }} />
        <StatusSelect />
        <Stack
          spacing={2}
          sx={{
            mt: 6,
            mb: -1,
            justifyContent: "flex-end",
            alignItems: "center",
            "& button,a": { width: { xs: "100%", sm: "auto" } },
          }}
          direction={"row"}
        >
          <Link href={"/"}>
            <Button variant={"outlined"}>Cancel</Button>
          </Link>
          <Button variant={"contained"} type={"submit"}>
            Submit
          </Button>
        </Stack>
      </Card>
    </FormProvider>
  );
}
