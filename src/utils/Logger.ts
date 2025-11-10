export const log = (...args: any[]) => {
  if (__DEV__) console.log(...args);
};

export const warn = (...args: any[]) => {
  if (__DEV__) console.warn(...args);
};

export const error = (...args: any[]) => {
  console.error(...args);
};
