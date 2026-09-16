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

  // Việc nghiệp vụ đã rời menu ⋯ xuống thanh dưới đáy màn; người dùng đi tìm sẽ
  // gõ đúng chữ họ thấy trên màn hình.
  it("tra được thanh thao tác mới ở cả tài liệu lẫn câu hỏi thường gặp", () => {
    const ids = filterGuideTopics("thanh thao tac").map((hit) => hit.topic.id);

    expect(ids).toContain("tai-san");
    expect(ids).toContain("faq");
  });

  it("tra được câu hỏi vì sao mất thông báo Tạo mới thành công", () => {
    const hit = filterGuideTopics("tao moi thanh cong").find(
      (entry) => entry.topic.id === "faq",
    );

    expect(hit?.matchedHeadings).toContain(
      'Lưu xong không thấy thông báo "Tạo mới thành công"',
    );
  });

  // Nguồn thông báo camera đổi từ đầu ghi phát hiện chuyển động sang AI nhận
  // dạng hình ảnh: người dùng giờ đi tìm bằng đúng chữ trên thông báo.
  it("tra được thông báo camera theo loại sự kiện AI", () => {
    ["hut thuoc", "chay khoi", "phat hien doi tuong"].forEach((tuKhoa) => {
      expect(filterGuideTopics(tuKhoa).map((hit) => hit.topic.id)).toContain(
        "camera",
      );
    });
  });

  // "Áp dụng cho" là nhãn thật trên màn Thông báo camera, nên đây là cách người
  // dùng đi tra khi muốn tắt riêng một camera.
  it("tra được cách tắt thông báo riêng một camera theo nhãn trên màn hình", () => {
    const hits = filterGuideTopics("ap dung cho");

    expect(hits.map((hit) => hit.topic.id)).toEqual(
      expect.arrayContaining(["camera", "faq"]),
    );
    expect(
      hits.find((hit) => hit.topic.id === "faq")?.matchedHeadings,
    ).toContain("Chỉ muốn tắt thông báo của một camera, được không?");
  });

  it("tra được cách phóng to hình camera ở cả tài liệu lẫn câu hỏi thường gặp", () => {
    const ids = filterGuideTopics("phong to").map((hit) => hit.topic.id);

    expect(ids).toEqual(expect.arrayContaining(["camera", "faq"]));
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
