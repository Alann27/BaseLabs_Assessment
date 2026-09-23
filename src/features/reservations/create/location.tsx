import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import { Controller, useFormContext } from "react-hook-form";

import { ReservationFormValues } from "@/schemas/create-reservation";

interface LocationSelectProps {
  locationNameById: Record<string, string>;
  resetMutation: () => void;
}

export default function LocationSelect({ locationNameById, resetMutation }: LocationSelectProps) {
  const { control, setValue } = useFormContext<ReservationFormValues>();

  return (
    <Box sx={{ width: "100%" }}>
      <InputLabel htmlFor={"location"} sx={{ mb: 1, color: "black" }}>
        Location
      </InputLabel>
      <Controller
        control={control}
        name={"location"}
        rules={{ required: "Required" }}
        render={({ field, fieldState }) => (
          <Autocomplete
            isOptionEqualToValue={(option, value) => option === value}
            options={Object.keys(locationNameById)}
            getOptionLabel={(option) => locationNameById[option] || option}
            value={field.value}
            onChange={(_, location) => {
              field.onChange(location);
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              setValue("equipments", [{ id: "", quantity: "" }]);
              resetMutation();
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                fullWidth
                id={params.id}
                placeholder={"Type to search locations"}
                helperText={fieldState?.error?.message}
                error={!!fieldState?.error?.message}
              />
            )}
          />
        )}
      />
    </Box>
  );
}
