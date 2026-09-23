"use client";
import { useState } from "react";
import InputLabel from "@mui/material/InputLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Controller, useFormContext } from "react-hook-form";

import { ReservationFormValues } from "@/schemas/create-reservation";

dayjs.extend(utc);

interface DatePickerProps {
  label: string;
  name: "startAt" | "endAt";
}

function DatePicker({ label, name }: DatePickerProps) {
  const { control } = useFormContext<ReservationFormValues>();
  const [open, setOpen] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DateTimePicker
          name={name}
          label={label}
          format={"YYYY-MM-DD hh:mm A"}
          views={["day", "hours", "minutes"]}
          disablePast
          open={open}
          timezone={"UTC"}
          onChange={(value) => {
            field.onChange(value && value.isValid() ? value.toDate() : null);
          }}
          value={field.value ? dayjs.utc(field.value) : null}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          slotProps={{
            textField: {
              inputRef: field.ref,
              readOnly: true,
              onClick: () => {
                setOpen(true);
              },
              helperText: fieldState.error?.message,
              error: !!fieldState.error?.message,
            },
            desktopTransition: {},
          }}
        />
      )}
    />
  );
}

export default function DateRange() {
  const { formState } = useFormContext<ReservationFormValues>();

  const dateError = !!formState.errors.endAt?.message || !!formState.errors.startAt?.message;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack>
        <InputLabel sx={{ mb: 1, color: "black" }}>Date Range</InputLabel>
        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <DatePicker label={"Start Date"} name={"startAt"} />
          <DatePicker label={"End Date"} name={"endAt"} />
        </Stack>
        {!dateError && (
          <Typography color="textSecondary" sx={{ fontSize: 12, my: 0.5 }}>
            Dates are saved in UTC
          </Typography>
        )}
      </Stack>
    </LocalizationProvider>
  );
}
