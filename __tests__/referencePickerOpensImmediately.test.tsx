import React from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import EnumAndReferencePickerModal from "../src/components/modal/EnumAndReferencePickerModal";
import {
  isReferenceFirstPageLoading,
  useOpenReferenceModal,
} from "../src/hooks/AssetAddItem/useOpenReferenceModal";
import { useEnumAndReferenceLoader } from "../src/hooks/AssetAddItem/useEnumAndReferenceLoader";
import { fetchReferenceByField } from "../src/utils/fetchField/FetchReferenceField";
import { fetchEnumByField } from "../src/utils/fetchField/FetchEnumField";
import { TypeProperty } from "../src/utils/Enum";

jest.mock("../src/utils/fetchField/FetchReferenceField", () => ({
  fetchReferenceByField: jest.fn(),
}));

jest.mock("../src/utils/cascade/FetchReferenceByFieldWithParent", () => ({
  fetchReferenceByFieldWithParent: jest.fn(),
}));

jest.mock("../src/utils/fetchField/FetchEnumField", () => ({
  fetchEnumByField: jest.fn(),
}));

jest.mock("../src/utils/Logger", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockedFetchReference = jest.mocked(fetchReferenceByField);
const mockedFetchEnum = jest.mocked(fetchEnumByField);

type PendingFetch = {
  fieldName: string;
  succeed: (items: Array<{ value: any; text: string }>) => Promise<void>;
  fail: () => Promise<void>;
};

let pendingFetches: PendingFetch[] = [];

/* Giả lập `fetchReference` thật: thành công thì ghi đè entry của field rồi mới
   trả kết quả; lỗi thì chỉ trả `errorMessage`, không đụng state. */
beforeEach(() => {
  pendingFetches = [];
  mockedFetchReference.mockReset().mockImplementation(
    (_referenceName, fieldName, setReference) =>
      new Promise((resolve) => {
        pendingFetches.push({
          fieldName,
          succeed: async (items) => {
            await ReactTestRenderer.act(async () => {
              setReference((prev) => ({
                ...prev,
                [fieldName]: { items, totalCount: items.length },
              }));
              resolve({ items, totalCount: items.length });
            });
          },
          fail: async () => {
            await ReactTestRenderer.act(async () => {
              resolve({
                items: [],
                totalCount: 0,
                errorMessage: "Vui lòng kiểm tra kết nối mạng rồi thử lại.",
              } as any);
            });
          },
        });
      }) as any,
  );
  mockedFetchEnum.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const referenceField = (name: string, parentsFields?: string) =>
  ({
    name,
    moTa: name,
    typeProperty: TypeProperty.Reference,
    referenceName: `Ref_${name}`,
    parentsFields,
  }) as any;

type HookSnapshot = {
  modalVisible: boolean;
  activeFieldName: string | null;
  referenceData: Record<string, any>;
  errorMessage: string | null;
};

const mountOpener = async (formData: Record<string, any> = {}) => {
  const renders: HookSnapshot[] = [];
  let api: ReturnType<typeof useOpenReferenceModal> & {
    setModalVisible: (v: boolean) => void;
  };

  function Harness() {
    const [referenceData, setReferenceData] = React.useState<any>({});
    const [modalVisible, setModalVisible] = React.useState(false);
    const [activeEnumField, setActiveEnumField] = React.useState<any>(null);
    const [errorMessage, setReferenceErrorMessage] = React.useState<
      string | null
    >(null);
    const hook = useOpenReferenceModal({
      formData,
      setActiveEnumField,
      setRefKeyword: () => {},
      setRefPage: () => {},
      setRefHasMore: () => {},
      setModalVisible,
      setReferenceErrorMessage,
      setReferenceData,
      pageSize: 20,
    });

    api = { ...hook, setModalVisible };
    renders.push({
      modalVisible,
      activeFieldName: activeEnumField?.name ?? null,
      referenceData,
      errorMessage,
    });
    return null;
  }

  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Harness />);
  });

  return {
    renders,
    get api() {
      return api;
    },
    get latest() {
      return renders[renders.length - 1];
    },
    /* Chạm vào ô: chỉ chạy phần đồng bộ, KHÔNG đợi mạng. */
    tap: (field: any) => {
      ReactTestRenderer.act(() => {
        api.openReferenceModal(field);
      });
    },
    unmount: () => ReactTestRenderer.act(() => tree.unmount()),
  };
};

describe("useOpenReferenceModal — mở sheet ngay, không đợi mạng", () => {
  it("chạm là sheet mở với khung chờ, trang đầu về thì hết chờ", async () => {
    const view = await mountOpener();
    const field = referenceField("ID_Room");

    view.tap(field);

    expect(view.latest.modalVisible).toBe(true);
    expect(view.latest.activeFieldName).toBe("ID_Room");
    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_Room"),
    ).toBe(true);
    // Không có khung hình nào sheet đã mở mà chưa có cờ chờ.
    expect(
      view.renders.some(
        (r) =>
          r.modalVisible &&
          !isReferenceFirstPageLoading(r.referenceData, "ID_Room"),
      ),
    ).toBe(false);

    await pendingFetches[0].succeed([{ value: 1, text: "P.101" }]);

    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_Room"),
    ).toBe(false);
    expect(view.latest.referenceData.ID_Room.items).toHaveLength(1);
    await view.unmount();
  });

  it("thiếu cấp cha thì báo trước, không mở sheet, không gọi API", async () => {
    const view = await mountOpener({ ID_Complex: 3 });

    view.tap(referenceField("ID_Room", "ID_Complex,ID_Building"));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(view.latest.modalVisible).toBe(false);
    expect(mockedFetchReference).not.toHaveBeenCalled();
    await view.unmount();
  });

  it("tải hỏng thì sheet vẫn mở, hiện lỗi thay khung chờ", async () => {
    const view = await mountOpener();

    view.tap(referenceField("ID_Room"));
    await pendingFetches[0].fail();

    expect(view.latest.modalVisible).toBe(true);
    expect(view.latest.errorMessage).toMatch(/kết nối mạng/);
    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_Room"),
    ).toBe(false);
    await view.unmount();
  });

  it("lỗi về muộn của field cũ không hiện lên sheet field mới", async () => {
    const view = await mountOpener();

    view.tap(referenceField("ID_A"));
    view.tap(referenceField("ID_B"));
    await pendingFetches[0].fail(); // ID_A

    expect(view.latest.activeFieldName).toBe("ID_B");
    expect(view.latest.errorMessage).toBeNull();
    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_B"),
    ).toBe(true);

    await pendingFetches[1].succeed([{ value: 2, text: "B" }]);
    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_B"),
    ).toBe(false);
    await view.unmount();
  });

  it("đã đóng sheet thì phản hồi về sau không mở lại", async () => {
    const view = await mountOpener();

    view.tap(referenceField("ID_Room"));
    ReactTestRenderer.act(() => view.api.setModalVisible(false));
    await pendingFetches[0].succeed([{ value: 1, text: "P.101" }]);

    expect(view.latest.modalVisible).toBe(false);
    await view.unmount();
  });

  it("tải lại trang đầu khi danh sách đang rỗng (Thử lại) cũng hiện khung chờ", async () => {
    const view = await mountOpener();
    const field = referenceField("ID_Room");

    view.tap(field);
    await pendingFetches[0].fail();

    ReactTestRenderer.act(() => {
      view.api.loadReferenceModalData(field, { page: 0, append: false });
    });
    expect(view.latest.errorMessage).toBeNull();
    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_Room"),
    ).toBe(true);

    await pendingFetches[1].succeed([{ value: 1, text: "P.101" }]);
    expect(
      isReferenceFirstPageLoading(view.latest.referenceData, "ID_Room"),
    ).toBe(false);
    await view.unmount();
  });
});

describe("useEnumAndReferenceLoader — cờ Enum chưa tải xong", () => {
  it("bật từ lúc mở form tới khi lượt tải đầu về", async () => {
    let resolveEnum!: () => void;
    mockedFetchEnum.mockImplementation(
      () => new Promise<void>((resolve) => (resolveEnum = resolve)),
    );
    const fields = [
      {
        name: "TrangThai",
        moTa: "Trạng thái",
        typeProperty: TypeProperty.Enum,
        enumName: "TrangThaiEnum",
      },
    ] as any[];
    let pending: Record<string, true> = {};

    function Harness() {
      const [referenceData, setReferenceData] = React.useState<any>({});
      pending = useEnumAndReferenceLoader(
        fields,
        jest.fn(),
        setReferenceData,
        referenceData,
      ).pendingEnumFields;
      return null;
    }

    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<Harness />);
    });
    expect(pending.TrangThai).toBe(true);

    await ReactTestRenderer.act(async () => {
      resolveEnum();
    });
    expect(pending.TrangThai).toBeUndefined();
    await ReactTestRenderer.act(async () => tree.unmount());
  });
});

describe("EnumAndReferencePickerModal — thân danh sách lúc chờ / lỗi", () => {
  const renderPicker = async (props: Record<string, any>) => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <ThemeProvider>
            <EnumAndReferencePickerModal
              visible
              title="Phòng"
              items={[{ value: "", text: "Phòng" }]}
              onClose={() => {}}
              onSelect={() => {}}
              {...props}
            />
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });
    return tree!;
  };

  const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root
      .findAllByType(Text)
      .flatMap((node) => node.props.children)
      .filter((child) => typeof child === "string");

  it("đang chờ trang đầu: khung chờ, không báo 'Không tìm thấy dữ liệu'", async () => {
    const tree = await renderPicker({ loading: true });

    expect(
      tree.root.findAllByProps({ accessibilityLabel: "Đang tải dữ liệu" })
        .length,
    ).toBeGreaterThan(0);
    expect(texts(tree)).not.toContain("Không tìm thấy dữ liệu");
    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("lỗi thì có nút 'Thử lại' gọi onRetry", async () => {
    const onRetry = jest.fn();
    const tree = await renderPicker({
      loading: true,
      errorMessage: "Vui lòng kiểm tra kết nối mạng rồi thử lại.",
      onRetry,
    });

    expect(texts(tree)).toContain("Không thể tải dữ liệu");
    const retry = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) =>
        node.findAllByType(Text).some((t) => t.props.children === "Thử lại"),
      );
    expect(retry).toBeDefined();

    await ReactTestRenderer.act(async () => {
      retry!.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
