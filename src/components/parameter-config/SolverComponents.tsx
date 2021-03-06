import React, { useEffect, useState } from "react";
import { emit, on } from "../../messenger";
import { useSolver } from "../../store";
import PropertyRow from "./property-row/PropertyRow";
import PropertyRowLabel from "./property-row/PropertyRowLabel";
import PropertyRowButton from "./property-row/PropertyRowButton";
import { PropertyRowCheckbox } from "./property-row/PropertyRowCheckbox";
import { PropertyRowTextInput, PropertySliderInput } from "./property-row/PropertyRowTextInput";
import { PropertyRowNumberInput } from "./property-row/PropertyRowNumberInput";
import RayTracer from "../../compute/raytracer";
import { AllowedNames } from "../../common/helpers";
import { ImageSourceSolver } from "../../compute/raytracer/image-source";
import RT60 from "../../compute/rt";
import EnergyDecay from "../../compute/energy-decay";
import Box from "@mui/material/Box";

type SetPropertyEventTypes =
  | AllowedNames<EventTypes, SetPropertyPayload<RayTracer>>
  | AllowedNames<EventTypes, SetPropertyPayload<ImageSourceSolver>>
  | AllowedNames<EventTypes, SetPropertyPayload<RT60>>
  | AllowedNames<EventTypes, SetPropertyPayload<EnergyDecay>>

export function useSolverProperty<T extends RayTracer | ImageSourceSolver | RT60 | EnergyDecay, K extends keyof T>(
  uuid: string,
  property: K,
  event: SetPropertyEventTypes
) {
  const defaultValue = useSolver<T[K]>(
    (state) => (state.solvers[uuid] as T)[property]
  );
  console.log(event);
  const [state, setState] = useState<T[K]>(defaultValue);
  useEffect(
    () => on(event, (props) => {
      if (props.uuid === uuid && props.property === property) setState(props.value);
    }),
    [uuid]
  );
  //@ts-ignore
  const changeHandler = (e) => emit(event, { uuid, property, value: e.value });

  return [state, changeHandler] as [typeof state, typeof changeHandler];
}

type PropertyRowInputElement = ({ value, onChange, label }) => JSX.Element;
type Props<T extends RayTracer | ImageSourceSolver | RT60 | EnergyDecay, K extends keyof T> = {
  uuid: string;
  property: K;
  label: string;
  tooltip: string;
  elementProps?: {
    [key: string]: any
  }
};

export const createPropertyInput = <T extends RayTracer | ImageSourceSolver | RT60 | EnergyDecay>(
  event: SetPropertyEventTypes,
  Element: PropertyRowInputElement
) => <K extends keyof T>({ uuid, property, label, tooltip, elementProps }: Props<T, K>) => {
  const [state, changeHandler] = useSolverProperty<T, K>(uuid, property, event);
  return (
    <Box sx={{ width: "auto" }}>
      <PropertyRowLabel label={label} hasToolTip tooltip={tooltip} />
      <Element value={state} onChange={changeHandler} {...elementProps} label={label} />
    </Box>
  );
};

export const createPropertyInputs = <T extends RayTracer | ImageSourceSolver | RT60 | EnergyDecay>(event: SetPropertyEventTypes) => ({
  PropertyTextInput: createPropertyInput<T>(event, PropertyRowTextInput),
  PropertyNumberInput: createPropertyInput<T>(event, PropertyRowNumberInput),
  PropertyCheckboxInput: createPropertyInput<T>(event, PropertyRowCheckbox),
  PropertySliderInput: createPropertyInput<T>(event, PropertySliderInput)
});

export const PropertyButton = <T extends keyof EventTypes>({
                                                             args,
                                                             event,
                                                             label,
                                                             tooltip,
                                                             disabled
                                                           }: {
  args: EventTypes[T];
  event: T;
  label: string;
  tooltip: string;
  disabled?: boolean;
}) => {
  return (
    <PropertyRow>
      <PropertyRowLabel label={label} hasToolTip tooltip={tooltip} />
      <PropertyRowButton onClick={(e) => emit(event, args)} label={label} disabled={disabled} />
    </PropertyRow>
  );
};
