/** Nút cây tự tham chiếu: con cùng kiểu với cha, để đệ quy không phải ép kiểu. */
type TreeNode<T> = { id: string | number; children?: T[] };

/**
 * Map `id` → nút trong cây (kể cả nút con).
 *
 * Hàng Truy cập nhanh lưu bản chụp của mục lúc bấm, nên sau khi quản trị sửa cấu
 * hình (đổi tên class, đổi nhãn) bản chụp thành cũ — mở lại bằng nó là gọi API
 * với tên class không còn tồn tại rồi báo lỗi, trong khi bấm trong cây vẫn vào
 * được. Vì vậy chip phải tra lại nút theo id trong cây vừa tải và mở bằng nút
 * đó; id không còn trong cây (mục bị xoá bên quản trị hoặc bị lọc vì thu hồi
 * quyền) thì bỏ chip, thay vì để bấm vào rồi mở ra màn trống.
 */
export const collectTreeNodes = <T extends TreeNode<T>>(
  nodes: readonly T[] | undefined,
): Map<string | number, T> => {
  const map = new Map<string | number, T>();

  const walk = (list: readonly T[]) => {
    list.forEach((node) => {
      map.set(node.id, node);
      if (node.children?.length) walk(node.children);
    });
  };

  walk(nodes ?? []);

  return map;
};
