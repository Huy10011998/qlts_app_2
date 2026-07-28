import {
  parseCsv,
  removeVietnameseTones,
  capitalizeFirstLetter,
  normalizeClassName,
  isEffectivelyEmptyCodeValue,
} from "../src/utils/helpers/string";
import {
  isNetworkRequestError,
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../src/utils/helpers/api";
import {
  elevation,
  spacing,
  radius,
  fontSize,
} from "../src/utils/helpers/tokens";
import { APP_COLORS, C } from "../src/utils/helpers/colors";
import { mapPropertyResponseToPropertyClass } from "../src/utils/helpers/propertyClass";

describe("string helpers", () => {
  describe("parseCsv", () => {
    it("splits and trims each part", () => {
      expect(parseCsv("a, b ,c")).toEqual(["a", "b", "c"]);
    });
    it("keeps empty segments (caller filters if needed)", () => {
      expect(parseCsv("a,,b")).toEqual(["a", "", "b"]);
      expect(parseCsv("")).toEqual([""]);
    });
  });

  it("removeVietnameseTones strips diacritics and lowercases", () => {
    expect(removeVietnameseTones("Tài Sản Đơn")).toBe("tai san don");
    expect(removeVietnameseTones("Đường")).toBe("duong");
  });

  it("capitalizeFirstLetter handles empty/undefined", () => {
    expect(capitalizeFirstLetter("hello")).toBe("Hello");
    expect(capitalizeFirstLetter("")).toBe("");
    expect(capitalizeFirstLetter(undefined)).toBe("");
  });

  it("normalizeClassName", () => {
    expect(normalizeClassName("TaiSan")).toBe("TaiSan");
    expect(normalizeClassName("tai_san")).toBe("TaiSan");
    expect(normalizeClassName("")).toBe("");
    expect(normalizeClassName(undefined)).toBe("");
  });

  it("isEffectivelyEmptyCodeValue", () => {
    expect(isEffectivelyEmptyCodeValue(null)).toBe(true);
    expect(isEffectivelyEmptyCodeValue(undefined)).toBe(true);
    expect(isEffectivelyEmptyCodeValue("")).toBe(true);
    expect(isEffectivelyEmptyCodeValue("   ")).toBe(true);
    expect(isEffectivelyEmptyCodeValue(":")).toBe(true);
    expect(isEffectivelyEmptyCodeValue("ABC")).toBe(false);
    expect(isEffectivelyEmptyCodeValue(5)).toBe(false);
  });
});

describe("api helpers", () => {
  it("isNetworkRequestError only for statusless network errors", () => {
    expect(isNetworkRequestError({ code: "ERR_NETWORK" })).toBe(true);
    expect(isNetworkRequestError({ message: "Network Error" })).toBe(true);
    expect(isNetworkRequestError({ code: "ECONNABORTED" })).toBe(true);
    expect(isNetworkRequestError({ response: { status: 500 } })).toBe(false);
    expect(isNetworkRequestError({ response: { status: 401 } })).toBe(false);
    expect(isNetworkRequestError({})).toBe(false);
  });

  it("getApiErrorMessage prefers response message, falls back", () => {
    expect(
      getApiErrorMessage(
        { response: { data: { message: "Sai mật khẩu" } } },
        "fallback",
      ),
    ).toBe("Sai mật khẩu");
    expect(
      getApiErrorMessage(
        { response: { data: { data: [{ message: "A" }, { message: "B" }] } } },
        "fallback",
      ),
    ).toBe("A\nB");
    expect(getApiErrorMessage({}, "fallback")).toBe("fallback");
  });

  it("getApiValidationFieldErrors maps fieldName -> message", () => {
    const result = getApiValidationFieldErrors({
      response: { data: { data: [{ fieldName: "Ten", message: "Bắt buộc" }] } },
    });
    expect(result).toEqual({ Ten: "Bắt buộc" });
    expect(getApiValidationFieldErrors({})).toEqual({});
  });
});

describe("design tokens", () => {
  it("elevation levels map to the original shadow specs", () => {
    const shadow = "#1A2340";
    expect(elevation(shadow, 1)).toMatchObject({
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    });
    expect(elevation(shadow, 2)).toMatchObject({
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    });
    expect(elevation(shadow, 3)).toMatchObject({
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    });
    expect(elevation(shadow)).toMatchObject({
      shadowOpacity: 0.06,
      shadowRadius: 6,
    });
    expect(elevation(shadow, 1).shadowOffset).toEqual({ width: 0, height: 2 });
    expect(elevation(shadow, 1).shadowColor).toBe(shadow);
  });

  it("scales expose expected steps", () => {
    expect(spacing.md).toBe(12);
    expect(radius.pill).toBe(999);
    expect(fontSize.body).toBe(14);
  });
});

describe("color palette", () => {
  it("brand colors are stable hex values", () => {
    expect(C.red).toBe("#E31E24");
    expect(C.blue).toBe("#3B82F6");
    expect(C.onBrand).toBe("#FFFFFF");
  });
  it("C only carries brand colors, which are identical in both schemes", () => {
    // Theme-aware colors are deliberately absent from `C`: they must be read
    // through useAppColors/useStyles so a screen repaints when the user
    // switches the appearance in Settings.
    expect(C).not.toHaveProperty("bg");
    expect(C).not.toHaveProperty("textPrimary");
    expect(C).not.toHaveProperty("shadow");
    expect(APP_COLORS.light.red).toBe(APP_COLORS.dark.red);
  });
  it("exposes the full token set per scheme", () => {
    for (const scheme of ["light", "dark"] as const) {
      expect(APP_COLORS[scheme]).toHaveProperty("bg");
      expect(APP_COLORS[scheme]).toHaveProperty("textPrimary");
      expect(APP_COLORS[scheme]).toHaveProperty("shadow");
    }
  });
  it("resolves every theme-aware token to a distinct value per scheme", () => {
    // A token that never changes between schemes is a copy/paste slip in the
    // ADAPTIVE table; the only intentional matches are the brand colors.
    const brandKeys = Object.keys(C);
    const unchanged = Object.keys(APP_COLORS.light).filter(
      (key) =>
        !brandKeys.includes(key) &&
        APP_COLORS.light[key as keyof typeof APP_COLORS.light] ===
          APP_COLORS.dark[key as keyof typeof APP_COLORS.dark],
    );
    expect(unchanged).toEqual([]);
  });
});

describe("mapPropertyResponseToPropertyClass", () => {
  it("returns undefined for missing data", () => {
    expect(mapPropertyResponseToPropertyClass(undefined)).toBeUndefined();
  });
  it("picks the tu-dong-tang config fields", () => {
    const result = mapPropertyResponseToPropertyClass({
      isTuDongTang: true,
      propertyTuDongTang: "Ma",
      formatTuDongTang: "0000",
      prentTuDongTang: "P",
      prefix: "TS",
    } as any);
    expect(result).toEqual({
      isTuDongTang: true,
      propertyTuDongTang: "Ma",
      formatTuDongTang: "0000",
      prentTuDongTang: "P",
      prefix: "TS",
    });
  });
});
