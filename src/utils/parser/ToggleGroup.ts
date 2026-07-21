export const toggleGroupUtil = (
  prevState: Record<string, boolean>,
  groupName: string
) => ({
  ...prevState,
  [groupName]: !(prevState[groupName] ?? false),
});
