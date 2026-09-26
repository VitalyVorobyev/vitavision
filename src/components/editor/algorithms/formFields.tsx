// Barrel re-export — this file used to contain all form-field components
// inline. It now just re-exports the split-out modules so every existing
// importer keeps working unchanged. See:
//   controlMode.tsx  — control-mode context, class name constants, provider
//   fieldChrome.tsx  — tooltip + field label
//   numberUtils.ts   — pure number helpers + segmented-control heuristic
//   sections.tsx     — Section / CollapsibleSection
//   NumberField.tsx, CheckboxField.tsx, SelectField.tsx — field components

export { FormControlModeProvider, type FormControlMode } from "./controlMode";
export { Section, CollapsibleSection } from "./sections";
export { NumberField } from "./NumberField";
export { CheckboxField } from "./CheckboxField";
export { SelectField, type FieldOption } from "./SelectField";
