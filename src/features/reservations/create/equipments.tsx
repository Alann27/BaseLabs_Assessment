import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteForever from "@mui/icons-material/DeleteForever";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { ReservationFormValues } from "@/schemas/create-reservation";

interface EquipmentsProps {
  equipmentsByLocation: Record<string, Array<{ id: string; name: string; totalQuantity: number }>>;
  equipmentsWithNoAvailability: Array<{
    id: string;
    availableQuantity: number;
    available: boolean;
  }> | null;
  resetMutation: () => void;
}

function availabilityMessage(availableQuantity: number, name: string) {
  const noun = availableQuantity === 1 ? name : `${name}s`;

  if (availableQuantity === 0) {
    return `No ${noun} are available for the selected period.`;
  }

  return `Only ${availableQuantity} ${noun} ${availableQuantity === 1 ? "is" : "are"} available for the selected period.`;
}

export default function Equipments({
  equipmentsByLocation,
  equipmentsWithNoAvailability,
  resetMutation,
}: EquipmentsProps) {
  const { control, watch } = useFormContext<ReservationFormValues>();

  const location = watch("location");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "equipments",
    keyName: "id-hook",
  });

  const equipmentById: Record<string, EquipmentsProps["equipmentsByLocation"][string][number]> =
    equipmentsByLocation[location]?.reduce(
      (map, item) => ({
        ...map,
        [item.id]: item,
      }),
      {},
    ) || {};

  const autocompleteOptions = Object.keys(equipmentById || {});

  const mapEquipmentsWithNoAvailability: Record<
    string,
    NonNullable<EquipmentsProps["equipmentsWithNoAvailability"]>[number]
  > =
    equipmentsWithNoAvailability?.reduce(
      (map, item) => ({
        ...map,
        [item.id]: item,
      }),
      {},
    ) || {};

  const addEquipmentRow = () => {
    append({ id: "", quantity: "" });
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction={"row"} spacing={1} sx={{ mb: 2, width: "100%" }}>
        <InputLabel sx={{ color: "black" }}>Equipment</InputLabel>
        <IconButton sx={{ p: 0 }} disabled={!location} onClick={addEquipmentRow}>
          <AddCircleIcon />
        </IconButton>
      </Stack>
      <Stack spacing={1.5} divider={<Divider />} sx={{ width: "100%", px: 1 }}>
        {fields.map((arrayField, index) => {
          return (
            <Stack key={arrayField["id-hook"]}>
              <Stack
                spacing={2}
                direction={{ xs: "column", sm: "row" }}
                sx={{ width: "100%", alignItems: "center" }}
              >
                <Controller
                  control={control}
                  name={`equipments.${index}.id`}
                  rules={{ required: "Required" }}
                  render={({ field, formState }) => (
                    <Autocomplete
                      id={`equipment-${index}`}
                      options={autocompleteOptions}
                      getOptionLabel={(option) => equipmentById[option]?.name || option}
                      isOptionEqualToValue={(option, value) => option === value}
                      disabled={!location}
                      fullWidth
                      value={field.value}
                      onChange={(_, value) => field.onChange(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size={"small"}
                          fullWidth
                          placeholder={"Type to search equipment"}
                          slotProps={{
                            ...params.slotProps,
                            htmlInput: {
                              ...params.slotProps.htmlInput,
                              "aria-label": `Equipment ${index + 1}`,
                            },
                          }}
                          error={!!formState.errors.equipments?.[index]?.id}
                          helperText={formState.errors.equipments?.[index]?.id?.message}
                        />
                      )}
                    />
                  )}
                />

                <Stack
                  direction={"row"}
                  spacing={2}
                  sx={{ alignItems: "center", width: { xs: "100%", sm: "auto" } }}
                >
                  <Controller
                    control={control}
                    name={`equipments.${index}.quantity`}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        onChange={(e) => {
                          const equipmentWithNoAvailability =
                            mapEquipmentsWithNoAvailability[arrayField.id];
                          if (mapEquipmentsWithNoAvailability[arrayField.id]) {
                            if (
                              e.target.value &&
                              parseInt(e.target.value) <=
                                equipmentWithNoAvailability.availableQuantity
                            ) {
                              resetMutation();
                            }
                          }

                          field.onChange(e.target.value);
                        }}
                        type={"number"}
                        placeholder={"Quantity"}
                        slotProps={{
                          htmlInput: { "aria-label": `Quantity for equipment ${index + 1}` },
                        }}
                        size={"small"}
                        disabled={!location}
                        helperText={fieldState.error?.message}
                        error={!!fieldState.error?.message}
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                      />
                    )}
                  />

                  <IconButton
                    sx={{ p: 0 }}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <DeleteForever />
                  </IconButton>
                </Stack>
              </Stack>
              {mapEquipmentsWithNoAvailability[arrayField.id] && (
                <Typography
                  variant={"caption"}
                  sx={{ width: "100%!important", ml: 2, mt: 0.5 }}
                  color={"error"}
                >
                  {availabilityMessage(
                    mapEquipmentsWithNoAvailability[arrayField.id].availableQuantity,
                    equipmentById[arrayField.id].name,
                  )}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
