export const formatHHMM = (date: Date) => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

export const parseTime = (value?: string) => {
  const d = new Date();
  d.setSeconds(0);

  if (!value) return d;

  const [h, m] = value.split(":").map(Number);
  d.setHours(h ?? 0);
  d.setMinutes(m ?? 0);
  return d;
};
