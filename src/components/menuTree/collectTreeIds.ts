type TreeNode = { id: string | number; children?: TreeNode[] };

/**
 * Tập id của mọi nút trong cây (kể cả nút con).
 *
 * Dùng để đối chiếu hàng Truy cập nhanh với cây đang có: mục bị xoá bên quản trị
 * hoặc bị lọc vì thu hồi quyền thì không còn trong cây, chip phải biến theo —
 * nếu không, bấm vào sẽ mở ra màn trống hoặc lỗi quyền.
 */
export const collectTreeIds = (
  nodes: readonly TreeNode[] | undefined,
): Set<string | number> => {
  const ids = new Set<string | number>();

  const walk = (list: readonly TreeNode[]) => {
    list.forEach((node) => {
      ids.add(node.id);
      if (node.children?.length) walk(node.children);
    });
  };

  walk(nodes ?? []);

  return ids;
};
