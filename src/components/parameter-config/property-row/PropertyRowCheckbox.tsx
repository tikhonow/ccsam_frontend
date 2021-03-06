import React from "react";
import styled from "styled-components";
import Checkbox from "@mui/material/Checkbox";

export const StyledCheckboxInput = styled.input`
  margin-left: 0.5em;
  margin-top: 1px;
  height: 12px;
`;

interface Props {
  value: boolean;
  onChange: ({ value }: { value: boolean }) => void;
}

export const PropertyRowCheckbox = ({ value, onChange }: Props) => (
  <Checkbox
    checked={value}
    onChange={(e) => onChange({ value: e.currentTarget.checked })}
  />
);

export default PropertyRowCheckbox;
