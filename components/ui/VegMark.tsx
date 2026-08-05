import React from "react";
import { SvgIcon, SvgIconProps } from "@mui/material";

/**
 * The vegetarian marker: a leaf.
 *
 * Replaces MUI's `Restaurant` icon, which is a fork and knife and means "dining". Every
 * entry in this catalogue is a restaurant, so that glyph carried no information at the one
 * place it was meant to draw a distinction.
 *
 * Drawn here rather than imported because `@mui/icons-material` v5 has no `Eco`. Its nearest
 * relative, `EnergySavingsLeaf`, is a leaf with a lightning bolt cut through it and means
 * power consumption. This is the standard Material `eco` outline on the same 24x24 grid, so
 * it lines up with every other icon in the app.
 *
 * `currentColor`, so the surrounding chip decides the colour: green when the filter is on,
 * white over a card photograph, muted when it is off. Hard-coding green would make it
 * invisible on the green filled chip and illegible in the muted state.
 */
export const VegMark: React.FC<SvgIconProps> = (props) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <path d="M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.27 14.4 20 4 20 4S9.6 4.73 6.05 8.05z" />
  </SvgIcon>
);
