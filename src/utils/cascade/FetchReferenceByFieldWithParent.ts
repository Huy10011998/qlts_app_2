import {
  fetchReference,
  type FetchReferenceOptions,
} from "../fetchField/FetchReferenceField";
import type { ReferenceDataMap } from "../../types";

/**
 * Cascade reference fetch: same as `fetchReference`, with the parent value
 * passed positionally. Thin wrapper kept for existing call sites.
 */
export const fetchReferenceByFieldWithParent = (
  referenceName: string,
  fieldName: string,
  parentValue: unknown,
  setReference: React.Dispatch<React.SetStateAction<ReferenceDataMap>>,
  options?: Omit<FetchReferenceOptions, "parentValue">,
) => fetchReference(referenceName, fieldName, setReference, { ...options, parentValue });
