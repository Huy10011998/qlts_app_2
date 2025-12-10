export const ToggleGroupUtil = (
  prevState: Record<string, boolean>,
  groupName: string
) => ({
  ...prevState,
  [groupName]: !(prevState[groupName] ?? false),
});
