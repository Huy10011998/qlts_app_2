/** Nút cây tự tham chiếu: con cùng kiểu với cha, để đệ quy không phải ép kiểu. */
type TreeNode<T> = { id: string | number; children?: T[] };

/**
 * Đường đi từ gốc tới nút `id`, gồm cả chính nút đó (rỗng nếu không có).
 *
 * Dùng khi mở màn bằng một mục chỉ định sẵn (ví dụ bấm ô số liệu ở Trang chủ):
 * phải mở tất cả nhóm cha thì mục đó mới thực sự nhìn thấy được, chỉ mở mỗi nó
 * thì vẫn nằm trong nhánh đang gập.
 */
export const findTreePath = <T extends TreeNode<T>>(
  nodes: readonly T[] | undefined,
  id: string | number,
): T[] => {
  const walk = (list: readonly T[], trail: T[]): T[] => {
    for (const node of list) {
      const nextTrail = [...trail, node];

      // So sánh lỏng: id trong cây có thể là số còn tham số điều hướng là chuỗi.
      if (node.id === id || String(node.id) === String(id)) return nextTrail;

      if (node.children?.length) {
        const found = walk(node.children, nextTrail);
        if (found.length) return found;
      }
    }

    return [];
  };

  return walk(nodes ?? [], []);
};
