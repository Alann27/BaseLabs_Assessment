import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { Controller, useFormContext } from "react-hook-form";

import { ReservationFormValues } from "@/schemas/create-reservation";

export default function StatusSelect() {
  const { control } = useFormContext<ReservationFormValues>();

  return (
    <Controller
      control={control}
      name={"status"}
      render={({ field, fieldState }) => (
        <Box>
          <InputLabel sx={{ color: "black", mb: 1 }} htmlFor={"status"}>
            Status
          </InputLabel>
          <Select
            displayEmpty
            variant={"outlined"}
            {...field}
            sx={{ width: "100%", maxWidth: 300 }}
          >
            <MenuItem disabled value={""}>
              <em style={{ color: "gray" }}>Select a status</em>
            </MenuItem>
            <MenuItem value={"CONFIRMED"}>Confirmed</MenuItem>
            <MenuItem value={"DRAFT"}>Draft</MenuItem>
          </Select>
          {fieldState.error?.message && (
            <Typography color={"error"} sx={{ fontSize: 12, ml: 2, mt: 0.5 }}>
              Required
            </Typography>
          )}
        </Box>
      )}
    />
  );
}
