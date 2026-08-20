import { GUIDE_TOPICS, getGuideTopic } from "../src/screens/Guide/shared/guideContent";
import { filterGuideTopics } from "../src/screens/Guide/shared/guideSearch";

describe("tìm kiếm trong tài liệu hướng dẫn", () => {
  it("không có từ khoá thì trả về đủ chủ đề, không đánh dấu mục nào", () => {
    const hits = filterGuideTopics("");

    expect(hits).toHaveLength(GUIDE_TOPICS.length);
    expect(hits.every((hit) => hit.matchedHeadings.length === 0)).toBe(true);
  });

  // Người dùng gõ trên bàn phím ngoài hoặc gõ nhanh thì gần như luôn không dấu.
  it("gõ không dấu vẫn ra chủ đề có dấu", () => {
    const ids = filterGuideTopics("tu lanh").map((hit) => hit.topic.id);

    expect(ids).toContain("xac-nhan-tu-lanh");
    expect(ids).toContain("trung-chuyen-tu-lanh");
  });

  it("tìm được theo chữ nằm bên trong nội dung, không chỉ theo tên chủ đề", () => {
    const hits = filterGuideTopics("nha phan phoi");

    expect(hits.map((hit) => hit.topic.id)).toContain("trung-chuyen-tu-lanh");
  });

  it("trả về tên mục khớp để giải thích vì sao chủ đề khớp", () => {
    const hit = filterGuideTopics("faceid").find(
      (entry) => entry.topic.id === "dang-nhap",
    );

    expect(hit?.matchedHeadings).toContain("Bật và dùng Face ID");
  });

  it("từ khoá không có trong tài liệu thì không ra kết quả", () => {
    expect(filterGuideTopics("khong-he-co-chu-nay")).toHaveLength(0);
  });
});

describe("mục lục hướng dẫn", () => {
  it("mọi chủ đề đều tra được theo id và không trùng id", () => {
    const ids = GUIDE_TOPICS.map((topic) => topic.id);

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(getGuideTopic(id)?.id).toBe(id));
  });

  // Nút dấu hỏi trên header trỏ tới chủ đề bằng id; chủ đề rỗng thì bấm vào ra
  // một màn trắng.
  it("chủ đề nào cũng có ít nhất một mục và mục nào cũng có nội dung", () => {
    GUIDE_TOPICS.forEach((topic) => {
      expect(topic.sections.length).toBeGreaterThan(0);
      topic.sections.forEach((section) => {
        expect(section.blocks.length).toBeGreaterThan(0);
      });
    });
  });
});
