export const getApiErrorMessage = (
  error: any,
  fallback: string,
) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  if (Array.isArray(responseData?.data) && responseData.data.length > 0) {
    const messages = responseData.data
      .map((item: any) =>
        typeof item?.message === "string" ? item.message.trim() : "",
      )
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  return fallback;
};

export const getApiValidationFieldErrors = (error: any) => {
  const responseData = error?.response?.data;

  if (!Array.isArray(responseData?.data)) {
    return {} as Record<string, string>;
  }

  return responseData.data.reduce(
    (acc: Record<string, string>, item: any) => {
      if (typeof item?.fieldName !== "string" || !item.fieldName.trim()) {
        return acc;
      }

      acc[item.fieldName.trim()] =
        typeof item?.message === "string" ? item.message.trim() : "";
      return acc;
    },
    {},
  );
};
