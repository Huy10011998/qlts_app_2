import { buildPdfViewerHtml } from "../src/components/file/pdfViewerHtml";

const html = buildPdfViewerHtml("JVBERi0xLjQ=");

describe("trang HTML xem PDF", () => {
  // Thiếu thẻ này thì WebView lấy viewport ảo 980px, mọi phép canh giữa đều lệch.
  it("khai báo viewport theo bề ngang thiết bị", () => {
    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });

  // Tài liệu scan chữ nhỏ, canh vừa bề ngang rồi thì phải phóng được mới đọc nổi.
  it("cho phóng to để đọc chữ nhỏ", () => {
    expect(html).toContain("maximum-scale=5");
    expect(html).toContain("user-scalable=yes");
  });

  // Đây là nguyên nhân trang bị lệch: hệ số cố định làm canvas rộng theo khổ
  // trang PDF chứ không theo bề ngang khung xem.
  it("canh trang theo bề ngang khung, không dùng hệ số cố định", () => {
    expect(html).not.toContain("scale = 1.5");
    expect(html).toContain("clientWidth");
    expect(html).toContain("cssWidth / base.width");
  });

  it("giữ đúng thứ tự trang", () => {
    // Canvas được chèn vào DOM ngay trong vòng lặp, trước khi render bất đồng bộ.
    const appendIndex = html.indexOf("container.appendChild(canvas)");
    const renderIndex = html.indexOf("page.render(");

    expect(appendIndex).toBeGreaterThan(-1);
    expect(appendIndex).toBeLessThan(renderIndex);
  });

  it("nhúng dữ liệu file được truyền vào", () => {
    expect(html).toContain('var pdfData = "JVBERi0xLjQ=";');
  });
});
