import { C } from "../../../utils/helpers/colors";
import { GUIDE_FAQ_TOPIC } from "./guideFaq";
import type { GuideTopic, GuideTopicId } from "./guideTypes";

/**
 * Toàn bộ nội dung tài liệu hướng dẫn sử dụng.
 *
 * Viết bám sát đúng nhãn và thông báo có thật trong app: người dùng đọc hướng dẫn
 * trong lúc đang mở màn hình, chữ trong tài liệu lệch một chữ với chữ trên nút là
 * họ dừng lại. Khi đổi nhãn ở màn nào, sửa luôn chủ đề tương ứng ở đây.
 *
 * Ảnh minh hoạ để ở `src/assets/images/guide/` và thêm bằng block `image`; block
 * này là tuỳ chọn nên chủ đề chưa có ảnh vẫn dùng được bình thường.
 */
const TOPICS: GuideTopic[] = [
  // ─── Bắt đầu ───────────────────────────────────────────────────────────────
  {
    id: "dang-nhap",
    title: "Đăng nhập & Face ID",
    summary: "Đăng nhập, bật Face ID, xử lý khi hết phiên",
    iconName: "log-in-outline",
    iconBg: C.blue,
    group: "Bắt đầu",
    keywords: ["dang nhap", "login", "mat khau", "faceid", "face id", "mang noi bo"],
    sections: [
      {
        id: "dang-nhap-thuong",
        heading: "Đăng nhập bằng tài khoản",
        blocks: [
          {
            kind: "steps",
            items: [
              "Mở ứng dụng, chờ màn hình chào kết thúc.",
              "Nhập Tài khoản và Mật khẩu do IT cấp. Bấm hình con mắt ở cuối ô mật khẩu để xem lại chữ vừa nhập.",
              "Bấm Đăng nhập. Nút chỉ sáng khi cả hai ô đã có chữ.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Máy phải ở mạng nội bộ công ty (Wi-Fi công ty) mới kết nối được máy chủ. Nếu báo \"Không thể kết nối đến máy chủ\", hãy kiểm tra Wi-Fi trước khi thử lại.",
          },
        ],
      },
      {
        id: "dang-nhap-quyen-mang",
        heading: "Quyền mạng nội bộ (chỉ trên iPhone/iPad)",
        blocks: [
          {
            kind: "paragraph",
            text: "Ngay trên màn Đăng nhập có dòng trạng thái Mạng nội bộ. iOS bắt buộc phải cho phép quyền này, không có nó thì máy không gọi được tới máy chủ trong công ty.",
          },
          {
            kind: "bullets",
            items: [
              "Đã cấp quyền: dùng bình thường.",
              "Chưa cấp quyền: bấm vào dòng đó và chọn Cho phép ở hộp thoại của hệ thống.",
              "Đã chặn quyền: vào Cài đặt của iPhone → tìm ứng dụng → bật lại Local Network.",
            ],
          },
        ],
      },
      {
        id: "dang-nhap-faceid",
        heading: "Bật và dùng Face ID",
        blocks: [
          {
            kind: "steps",
            items: [
              "Đăng nhập bằng tài khoản và mật khẩu một lần trước đã.",
              "Vào tab Cài đặt → bật Đăng nhập FaceID và xác thực khuôn mặt khi máy hỏi.",
              "Lần sau ở màn Đăng nhập chỉ cần bấm nút Face ID, không phải nhập lại mật khẩu.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Nếu bấm Face ID mà báo \"FaceID chưa bật\" thì tài khoản này chưa từng bật ở tab Cài đặt trên máy đang dùng. Đăng nhập bằng mật khẩu rồi bật lại.",
          },
          {
            kind: "paragraph",
            text: "Face ID chỉ hiện trên iPhone/iPad. Máy Android đăng nhập bằng tài khoản và mật khẩu.",
          },
        ],
      },
      {
        id: "dang-nhap-het-phien",
        heading: "Khi phiên đăng nhập hết hạn",
        blocks: [
          {
            kind: "paragraph",
            text: "Đang dùng mà app hiện thông báo \"Phiên đăng nhập đã hết – Vui lòng đăng nhập lại\" thì đó là chuyện bình thường: phiên làm việc có thời hạn. Bấm đồng ý, app quay về màn Đăng nhập, đăng nhập lại là tiếp tục được.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Dữ liệu bạn đã bấm Gửi trước đó đã lưu trên máy chủ, không mất khi hết phiên. Chỉ có phần đang nhập dở dang trên màn hình là phải làm lại.",
          },
        ],
      },
    ],
  },
  {
    id: "tong-quan",
    title: "Tổng quan giao diện",
    summary: "5 tab dưới màn hình và thanh tiêu đề đỏ",
    iconName: "apps-outline",
    iconBg: C.redDeep,
    group: "Bắt đầu",
    keywords: ["tab", "thanh dieu huong", "giao dien", "header"],
    sections: [
      {
        id: "tong-quan-tab",
        heading: "Năm tab dưới màn hình",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Trang chủ: số liệu toàn công ty và các lối vào nhanh bạn tự chọn.",
              "Chức năng: danh mục đầy đủ mọi chức năng, có ô tìm kiếm.",
              "Quét QR: nút to ở giữa, mở máy quét tem QR.",
              "Camera: hệ thống camera theo khu vực.",
              "Cài đặt: hồ sơ, mật khẩu, giao diện, quyền và tài liệu hướng dẫn này.",
            ],
          },
        ],
      },
      {
        id: "tong-quan-header",
        heading: "Thanh tiêu đề đỏ",
        blocks: [
          {
            kind: "paragraph",
            text: "Mọi màn mở từ danh sách đều có thanh đỏ ở trên. Bên trái là mũi tên quay lại màn trước. Bên phải có thể có thêm nút, tuỳ màn:",
          },
          {
            kind: "bullets",
            items: [
              "Dấu hỏi: mở đúng chủ đề hướng dẫn của màn đang xem.",
              "Hình mã QR: quét tem để ra ngay bản ghi, nhanh hơn dò cây danh mục.",
              "Dấu ba chấm: thao tác quản trị bản ghi (Bản sao, Xoá). Việc nghiệp vụ như Đánh giá nằm ở thanh dưới đáy màn chi tiết, không nằm trong đây.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Nút nào không có quyền thì app ẩn hẳn, không hiện rồi báo lỗi. Thiếu nút cần dùng thì liên hệ IT để xin quyền.",
          },
        ],
      },
    ],
  },
  {
    id: "trang-chu",
    title: "Trang chủ",
    summary: "Số liệu, Truy cập nhanh, sắp xếp các khối",
    iconName: "home-outline",
    iconBg: C.emerald,
    group: "Bắt đầu",
    keywords: ["trang chu", "home", "truy cap nhanh", "tuy chinh", "sap xep", "diem danh"],
    sections: [
      {
        id: "trang-chu-khoi",
        heading: "Các khối trên Trang chủ",
        blocks: [
          {
            kind: "bullets",
            items: [
              "SỐ LIỆU TOÀN CÔNG TY: số thiết bị máy móc, thiết bị CNTT, camera đang hoạt động, số người đã điểm danh hôm nay.",
              "TRUY CẬP NHANH: các chức năng bạn tự ghim.",
              "Cơ cấu tài sản: lật qua từng trang để xem tỷ lệ.",
              "ĐIỂM DANH NHÂN SỰ HÔM NAY: đang làm việc / đã điểm danh / chưa điểm danh, bấm vào để xem chi tiết theo phòng ban.",
              "Các khối tiêu thụ: điện, điện mặt trời, nước cấp, nước thải, hơi.",
            ],
          },
        ],
      },
      {
        id: "trang-chu-ghim",
        heading: "Ghim chức năng hay dùng",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ở khối TRUY CẬP NHANH, bấm Tuỳ chỉnh.",
              "Tích chọn các chức năng muốn ghim, bỏ tích những cái không cần.",
              "Đóng bảng lại — hàng lối vào nhanh cập nhật ngay.",
            ],
          },
          {
            kind: "paragraph",
            text: "Lựa chọn được lưu theo tài khoản, đăng nhập máy khác vẫn còn.",
          },
        ],
      },
      {
        id: "trang-chu-sap-xep",
        heading: "Đổi thứ tự và ẩn khối",
        blocks: [
          {
            kind: "steps",
            items: [
              "Bấm Sắp xếp trên Trang chủ.",
              "Giữ và kéo một khối lên hoặc xuống để đổi vị trí.",
              "Tắt công tắc của khối nào không muốn thấy nữa.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Ẩn khối chỉ ẩn trên máy của bạn, không ảnh hưởng người khác. Muốn xem lại thì bật công tắc lên.",
          },
        ],
      },
    ],
  },

  // ─── Nghiệp vụ ─────────────────────────────────────────────────────────────
  {
    id: "quet-qr",
    title: "Quét mã QR",
    summary: "Quét tem trên thiết bị để mở ngay bản ghi",
    iconName: "qrcode-scan",
    lib: "material-community",
    iconBg: C.violet,
    group: "Nghiệp vụ",
    keywords: ["quet qr", "qr code", "tem", "scan", "camera"],
    sections: [
      {
        id: "quet-qr-cach-quet",
        heading: "Các bước quét",
        blocks: [
          {
            kind: "steps",
            items: [
              "Bấm nút tròn Quét QR ở giữa thanh tab, hoặc bấm hình mã QR ở góc phải thanh đỏ khi đang xem một danh sách tài sản.",
              "Lần đầu máy sẽ hỏi quyền camera — chọn Cho phép.",
              "Đưa camera vào tem QR trên thiết bị, giữ cách khoảng một gang tay cho khung ngắm ăn trọn tem.",
              "Máy rung nhẹ là đã đọc được mã; app tự mở màn Thông tin của thiết bị đó.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Tem mờ, bị dán chồng hoặc phản sáng thì đọc không ra. Lau tem, đổi góc để tránh bóng đèn, hoặc tìm thiết bị theo danh sách tài sản.",
          },
          {
            kind: "note",
            tone: "warn",
            text: "Quét phải tem không thuộc hệ thống thì app báo Mã QR không hợp lệ và không mở gì cả. Bấm OK là quét tiếp được.",
          },
        ],
      },
      {
        id: "quet-qr-sau-khi-quet",
        heading: "Sau khi quét ra thiết bị",
        blocks: [
          {
            kind: "paragraph",
            text: "App mở màn Thông tin của thiết bị. Nếu thiết bị có nhiều việc làm được thì bảng Làm gì với thiết bị này? tự mở sẵn — quét xong thường là để làm một việc gì đó, không phải để đọc.",
          },
          {
            kind: "steps",
            items: [
              "Chọn việc trong bảng, ví dụ Đánh giá.",
              "App mở thẳng màn nhập của việc đó, ô thiết bị đã điền sẵn.",
              "Nhập xong bấm Xác nhận ở góc phải thanh đỏ.",
              "App tự quay về màn quét kèm dải xanh Đã lưu…, camera sẵn sàng cho mã kế tiếp.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Chỉ muốn xem thông tin thì bấm ra ngoài bảng để đóng. Thiết bị chỉ làm được một việc thì bảng không mở, thanh dưới đáy màn ghi thẳng tên việc đó.",
          },
        ],
      },
      {
        id: "quet-qr-quet-lien-tuc",
        heading: "Quét nhiều thiết bị liên tiếp",
        blocks: [
          {
            kind: "paragraph",
            text: "Lưu xong là về ngay màn quét, nên đi kiểm tra cả loạt thiết bị thì cứ lặp: quét — chọn việc — nhập — Xác nhận. Không phải bấm quay lại lần nào.",
          },
          {
            kind: "bullets",
            items: [
              "Dải xanh Đã lưu… kèm mã thiết bị vừa lưu, tự tắt sau vài giây.",
              "Bấm Xem trên dải xanh để mở danh sách bản ghi vừa tạo, kiểm lại cho chắc.",
              "Quét mã mới là dải xanh tự mất.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tai-san",
    title: "Quản lý tài sản",
    summary: "Tra cứu, thêm, sửa, xoá và xem lịch sử thiết bị",
    iconName: "cube-outline",
    iconBg: C.amber,
    group: "Nghiệp vụ",
    keywords: [
      "tai san",
      "thiet bi",
      "may moc",
      "cntt",
      "danh sach",
      "them moi",
      "ban sao",
      "vuot the",
      "them nhanh",
      "them muc con",
      "danh gia nhanh",
      "them nhanh danh muc",
      "dau cong",
      "bang chon",
      "khong co trong danh sach",
    ],
    sections: [
      {
        id: "tai-san-tra-cuu",
        heading: "Tìm một thiết bị",
        blocks: [
          {
            kind: "steps",
            items: [
              "Vào tab Chức năng (hoặc lối vào nhanh trên Trang chủ) và chọn nhóm tài sản cần xem.",
              "Đi theo cây danh mục tới đúng loại tài sản để ra danh sách bản ghi.",
              "Gõ vào ô tìm kiếm để lọc. Gõ không dấu vẫn ra kết quả.",
              "Bấm vào một dòng để mở màn chi tiết.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Đứng ngay trước thiết bị thì bấm hình mã QR ở góc phải thanh đỏ — quét tem ra bản ghi nhanh hơn dò danh mục.",
          },
        ],
      },
      {
        id: "tai-san-chi-tiet",
        heading: "Màn chi tiết",
        blocks: [
          {
            kind: "paragraph",
            text: "Thông tin xếp theo tab và theo nhóm gập/mở được. Cuộn xuống có các danh sách liên quan (phiếu đánh giá, lịch sử…); bấm vào một dòng để xem Chi tiết lịch sử.",
          },
          {
            kind: "bullets",
            items: [
              "Sửa: mở màn Chỉnh sửa để cập nhật bản ghi.",
              "Dấu ba chấm → Bản sao: tạo bản ghi mới lấy sẵn dữ liệu của bản ghi đang xem, cho thiết bị giống nhau.",
              "Dấu ba chấm → Xoá: xoá bản ghi, cần xác nhận.",
            ],
          },
        ],
      },
      {
        id: "tai-san-thanh-thao-tac",
        heading: "Thanh thao tác dưới đáy màn",
        blocks: [
          {
            kind: "paragraph",
            text: "Đáy màn chi tiết có thanh làm việc với thiết bị. Đây là chỗ ghi nhận đánh giá, kiểm kê, báo hỏng… — không còn nằm trong dấu ba chấm nữa.",
          },
          {
            kind: "bullets",
            items: [
              "Thiết bị chỉ làm được một việc: nút ghi thẳng tên việc, ví dụ Đánh giá. Bấm là vào màn nhập luôn.",
              "Thiết bị làm được nhiều việc: nút ghi Chọn thao tác kèm số việc, bấm ra bảng chọn.",
              "Dòng nhỏ bên dưới, ví dụ Lịch sử đánh giá (7), mở danh sách bản ghi đã có của việc đó.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Không thấy thanh này nghĩa là loại tài sản chưa khai danh mục con nào, hoặc tài khoản không có quyền thêm bản ghi con.",
          },
        ],
      },
      {
        id: "tai-san-them",
        heading: "Thêm bản ghi mới",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ở màn danh sách, bấm Thêm mới.",
              "Điền các ô bắt buộc; ô nào chọn từ danh mục thì bấm vào để mở bảng chọn.",
              "Bấm lưu. Bản ghi mới hiện ngay trong danh sách.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Không thấy nút Thêm mới, Sửa hay Xoá nghĩa là tài khoản chưa có quyền tương ứng với loại tài sản đó, chứ không phải app lỗi.",
          },
        ],
      },
      {
        id: "tai-san-them-nhanh-danh-muc",
        heading: "Bảng chọn không có giá trị cần: thêm ngay tại đó",
        blocks: [
          {
            kind: "paragraph",
            text: "Đang nhập dở một bản ghi mà ô chọn từ danh mục chưa có giá trị mình cần (đơn vị mới, nhà cung cấp mới…) thì không phải thoát form ra tạo rồi quay lại nhập lại từ đầu.",
          },
          {
            kind: "steps",
            items: [
              "Bấm vào ô chọn để mở bảng chọn.",
              "Tìm không thấy thì bấm nút dấu + màu đỏ nằm bên phải ô tìm kiếm.",
              "Bảng chọn đổi thành form thêm mới của chính danh mục đó, đủ các ô như màn thêm mới bình thường.",
              "Điền xong bấm Lưu ở góc phải trên. App báo Tạo mới thành công.",
              "Bấm OK để về lại bảng chọn — danh sách đã tải lại và có bản ghi vừa tạo. Chạm vào dòng đó để chọn.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Bản ghi vừa tạo KHÔNG tự điền vào ô. Tạo được không có nghĩa là đã chọn, nên vẫn phải chạm chọn như mọi dòng khác — tránh việc app tự điền một giá trị mình chưa kịp xem lại.",
          },
          {
            kind: "bullets",
            items: [
              "Muốn về danh sách mà không lưu: bấm mũi tên ◄ góc trái trên, hoặc nút back của máy.",
              "Bấm ra ngoài vùng bảng chọn là đóng hẳn, phần đang nhập dở mất.",
              "Dùng được ở mọi form: Thêm mới, Chỉnh sửa, Bản sao và cả thêm bản ghi con.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Không thấy nút dấu + thì có hai khả năng: tài khoản chưa có quyền thêm ở đúng danh mục đó, hoặc ô này chọn từ danh sách cố định (Có/Không, trạng thái…) chứ không phải danh mục — loại đó không thêm được từ app.",
          },
        ],
      },
      {
        id: "tai-san-vuot-them-con",
        heading: "Thêm nhanh bản ghi con bằng cách vuốt",
        blocks: [
          {
            kind: "paragraph",
            text: "Đường tắt cho việc làm hằng ngày: thay vì mở chi tiết → tab Chi tiết → danh sách con → Thêm mới, vuốt thẳng trên dòng ở danh sách là vào ngay màn thêm mới, bản ghi cha được điền sẵn.",
          },
          {
            kind: "steps",
            items: [
              "Ở màn danh sách, vuốt một dòng sang trái.",
              "Bấm nút đỏ hiện ra ở mép phải. Nút ghi đúng việc sẽ làm, ví dụ Đánh giá ở danh sách bình chữa cháy.",
              "Loại tài sản có nhiều danh mục con thì app hỏi thêm một bước: chọn danh mục cần thêm.",
              "Điền và bấm lưu. Lưu xong app mở danh sách con để thấy ngay bản ghi vừa tạo; bấm back là về lại đúng danh sách vừa vuốt.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Danh sách nào vuốt được thì có dòng nhắc màu đỏ nhạt ngay dưới ô tìm kiếm. Không có dòng đó nghĩa là loại tài sản này không khai báo danh mục con nào, hoặc tài khoản chưa có quyền thêm ở danh mục con — không phải app lỗi.",
          },
        ],
      },
    ],
  },
  {
    id: "xac-nhan-tu-lanh",
    title: "Xác nhận vị trí tủ lạnh",
    summary: "Chụp ảnh tại chỗ kèm toạ độ để xác nhận tủ",
    iconName: "fridge-outline",
    lib: "material-community",
    iconBg: C.red,
    group: "Nghiệp vụ",
    keywords: ["tu lanh", "xac nhan vi tri", "gps", "toa do", "chup anh", "noi dia"],
    sections: [
      {
        id: "xac-nhan-mo",
        heading: "Mở chức năng",
        blocks: [
          {
            kind: "steps",
            items: [
              "Tìm con tủ cần xác nhận: quét tem QR trên tủ, hoặc mở nó từ danh sách tài sản nội địa.",
              "Ở màn chi tiết, bấm Xác nhận vị trí tủ lạnh trên thanh dưới đáy màn (trước đây nằm trong dấu ba chấm).",
              "Mở từ danh sách tài sản thì app ra màn Lịch sử xác nhận — bấm nút Xác nhận để bắt đầu lần mới.",
              "Quét tem QR thì app vào thẳng màn xác nhận, bỏ qua bước xem lịch sử.",
            ],
          },
        ],
      },
      {
        id: "xac-nhan-gui",
        heading: "Điền và gửi",
        blocks: [
          {
            kind: "steps",
            items: [
              "Chờ dòng Vị trí hiện tại lấy xong toạ độ. Lần đầu máy sẽ hỏi quyền vị trí — chọn Cho phép.",
              "Bấm CHỤP ẢNH và chụp con tủ ngay tại chỗ. Chưa vừa ý thì bấm Chụp lại.",
              "Chọn Trạng thái sử dụng.",
              "Ghi chú thêm nếu cần, rồi bấm Gửi.",
              "Màn Kết quả xác nhận hiện lên; bấm Xem lịch sử để kiểm tra lại lần vừa gửi.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "Ảnh phải chụp trực tiếp bằng camera, app không cho chọn ảnh có sẵn trong thư viện — đây là ảnh làm bằng chứng. Ảnh được tự đóng dấu tên tài khoản và thời điểm chụp.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Đứng trong nhà hoặc chỗ khuất trời thì máy lấy toạ độ rất lâu. Ra chỗ thoáng vài giây rồi quay lại màn hình.",
          },
        ],
      },
      {
        id: "xac-nhan-lich-su",
        heading: "Xem lại lịch sử",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Chọn Từ ngày – Đến ngày rồi bấm Lọc để xem đúng khoảng thời gian; bấm Xoá lọc để xem lại tất cả.",
              "Mỗi dòng cho biết khoảng cách so với toạ độ khách hàng và ghi chú lúc gửi.",
              "Bấm Xem bản đồ để mở vị trí trên ứng dụng bản đồ của máy.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "trung-chuyen-tu-lanh",
    title: "Trung chuyển tủ lạnh",
    summary: "Chuyển tủ sang nhà phân phối / khách hàng khác",
    iconName: "swap-horizontal",
    iconBg: C.rose,
    group: "Nghiệp vụ",
    keywords: ["trung chuyen", "tu lanh", "nha phan phoi", "khach hang", "chuyen tu"],
    sections: [
      {
        id: "trung-chuyen-chon-tu",
        heading: "Chọn con tủ",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Từ chức năng Trung chuyển tủ lạnh: tìm tủ trong danh sách, hoặc quét tem QR trên tủ ở tab Quét.",
              "Hoặc mở chi tiết con tủ rồi bấm Trung chuyển tủ lạnh trên thanh dưới đáy màn (trước đây nằm trong dấu ba chấm).",
            ],
          },
          {
            kind: "paragraph",
            text: "Mở từ danh sách tài sản thì app ra màn Lịch sử trung chuyển của con tủ — bấm dấu (+) để tạo lần chuyển mới. Quét tem QR thì app vào thẳng bước chọn nhà phân phối.",
          },
        ],
      },
      {
        id: "trung-chuyen-cac-buoc",
        heading: "Ba bước chuyển",
        blocks: [
          {
            kind: "steps",
            items: [
              "Chọn nhà phân phối nhận tủ.",
              "Chọn khách hàng — danh sách đã lọc theo nhà phân phối vừa chọn.",
              "Ở màn Xác nhận trung chuyển, đối chiếu Miền / Vùng miền / Khu vực / NPP / Khách hàng ở cột trước và cột sau, rồi bấm Chuyển.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "Bấm Chuyển là áp dụng ngay, không có bước chờ duyệt và không tự hoàn lại được. Đọc lại bảng đối chiếu trước khi bấm; chuyển sai thì phải làm một lần trung chuyển khác để đưa về đúng chỗ.",
          },
        ],
      },
      {
        id: "trung-chuyen-lich-su",
        heading: "Xem lại lịch sử trung chuyển",
        blocks: [
          {
            kind: "paragraph",
            text: "Màn Lịch sử trung chuyển liệt kê từng lần chuyển của con tủ, mỗi lần ghi đủ năm cấp vị trí cũ và mới, để đối chiếu khi khách hàng thắc mắc tủ đang ở đâu.",
          },
        ],
      },
    ],
  },

  // ─── Theo dõi & báo cáo ────────────────────────────────────────────────────
  {
    id: "camera",
    title: "Hệ thống camera",
    summary: "Xem trực tiếp và xem lại camera theo khu vực",
    iconName: "videocam-outline",
    iconBg: C.sky,
    group: "Theo dõi & báo cáo",
    keywords: [
      "camera",
      "cctv",
      "live view",
      "xem lai",
      "playback",
      "thong bao",
      "noti",
      "chuyen dong",
      "tam dung",
      "bao dong",
      "dau ghi",
    ],
    sections: [
      {
        id: "camera-xem",
        heading: "Xem camera",
        blocks: [
          {
            kind: "steps",
            items: [
              "Vào tab Camera để xem các khu vực; gõ ô tìm kiếm nếu nhiều khu vực.",
              "Chọn một khu vực để ra Danh sách Camera.",
              "Bấm một camera để xem trực tiếp, hoặc chọn Live View Camera để xem nhiều camera cùng lúc dạng lưới.",
              "Xoay ngang máy để hình lớn hơn.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Camera chỉ xem được khi máy đang ở mạng nội bộ công ty. Ra ngoài mạng thì hình không lên, không phải camera hỏng.",
          },
        ],
      },
      {
        id: "camera-quyen",
        heading: "Khi không thấy danh sách",
        blocks: [
          {
            kind: "paragraph",
            text: "Nếu tab Camera báo \"Tài khoản hiện tại không có quyền xem danh sách camera\" thì cần IT cấp quyền xem camera cho tài khoản; bản thân app không mở được quyền này.",
          },
        ],
      },
      {
        id: "camera-thong-bao",
        heading: "Thông báo phát hiện chuyển động",
        blocks: [
          {
            kind: "paragraph",
            text: "Khi đầu ghi phát hiện chuyển động ở camera đã được bật theo dõi, app hiện thông báo kèm tên camera, vị trí và thời điểm.",
          },
          {
            kind: "steps",
            items: [
              "Bấm vào thông báo — app mở thẳng hình trực tiếp của đúng camera đó.",
              "Xoay ngang máy để xem hình lớn hơn.",
            ],
          },
          {
            kind: "bullets",
            items: [
              "Thông báo không kèm ảnh chụp hiện trường; muốn biết chuyện gì thì phải mở xem trực tiếp.",
              "App không lưu lịch sử thông báo — vuốt bỏ rồi thì không xem lại được trong app.",
              "Một camera chỉ báo tối đa một lần mỗi 10 giây, nhưng nhiều camera cùng có chuyển động thì vẫn dồn nhiều thông báo một lúc.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Không nhận được thông báo nào thì kiểm tra ba chỗ: Cài đặt của app còn hiện dòng Thông báo camera không (không hiện là tài khoản chưa được IT cấp quyền), Quyền thông báo đã ở trạng thái Đã cấp quyền chưa, và có ai đang đặt tạm dừng không.",
          },
        ],
      },
      {
        id: "camera-tam-dung-thong-bao",
        heading: "Tạm dừng thông báo",
        blocks: [
          {
            kind: "paragraph",
            text: "Khi đang thi công, dọn kho hay có việc làm camera báo liên tục, có thể tắt thông báo trong một khoảng thời gian rồi app tự bật lại.",
          },
          {
            kind: "steps",
            items: [
              "Vào tab Cài đặt, chọn Thông báo camera.",
              "Điền lý do — không bắt buộc, nhưng nên có để sau này biết ai tắt và vì sao.",
              "Bấm một trong bốn mốc 15 phút, 30 phút, 1 giờ hoặc 4 giờ.",
              "Hết giờ app tự nhận thông báo trở lại; muốn nhận sớm hơn thì bấm Bật lại ngay.",
            ],
          },
          {
            kind: "paragraph",
            text: "Khối trên cùng cho biết đang nhận hay đang tạm dừng, còn bao lâu, ai tắt và lý do. Đặt mốc mới trong lúc đang tạm dừng thì mốc cũ bị thay chứ không cộng dồn.",
          },
          {
            kind: "note",
            tone: "warn",
            text: "Khối TẮT CHO CẢ CÔNG TY viền đỏ ở cuối màn áp dụng cho MỌI NGƯỜI, không riêng bạn — app hỏi xác nhận trước khi tắt. Bốn nút phía trên chỉ tắt cho riêng bạn.",
          },
          {
            kind: "paragraph",
            text: "Thấy dòng \"cả công ty\" ở phần trạng thái nghĩa là người khác đã tắt cho tất cả; tên người tắt hiện ngay bên dưới. Bật lại lệnh đó cũng là bật lại cho mọi người nên app hỏi xác nhận một lần nữa.",
          },
        ],
      },
    ],
  },
  {
    id: "bao-cao",
    title: "Báo cáo & điện mặt trời",
    summary: "Xem báo cáo, lọc số liệu, theo dõi sản lượng điện",
    iconName: "bar-chart-outline",
    iconBg: C.emerald,
    group: "Theo dõi & báo cáo",
    keywords: ["bao cao", "report", "dien mat troi", "solar", "san luong", "loc"],
    sections: [
      {
        id: "bao-cao-xem",
        heading: "Mở một báo cáo",
        blocks: [
          {
            kind: "steps",
            items: [
              "Vào tab Chức năng, cuộn tới nhóm Báo cáo.",
              "Chọn báo cáo cần xem.",
              "Bấm nút lọc để chọn điều kiện (khoảng thời gian, đơn vị…).",
              "Kéo màn hình xuống để tải lại số liệu mới nhất.",
            ],
          },
        ],
      },
      {
        id: "bao-cao-solar",
        heading: "Điện mặt trời",
        blocks: [
          {
            kind: "paragraph",
            text: "Chức năng Điện mặt trời hiện sản lượng phát và lượng tiêu thụ của nhà máy, tỷ lệ điện tự dùng so với điện mua lưới, kèm biểu đồ so sánh giữa các năm. Bấm vào biểu đồ để xem giá trị từng mốc.",
          },
        ],
      },
    ],
  },
  {
    id: "phuong-tien",
    title: "Theo dõi phương tiện",
    summary: "Hành trình, điểm dừng đỗ, vị trí hiện tại của xe",
    iconName: "car-outline",
    iconBg: C.blue,
    group: "Theo dõi & báo cáo",
    keywords: ["phuong tien", "xe", "hanh trinh", "dung do", "vi tri", "ban do", "gps"],
    sections: [
      {
        id: "phuong-tien-ba-chuc-nang",
        heading: "Ba chức năng",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Hành trình phương tiện: các chuyến của một xe, gom theo ngày.",
              "Dừng đỗ phương tiện: các điểm xe dừng và đỗ.",
              "Vị trí hiện tại phương tiện: xe đang ở đâu ngay lúc này.",
            ],
          },
        ],
      },
      {
        id: "phuong-tien-cach-dung",
        heading: "Cách xem",
        blocks: [
          {
            kind: "steps",
            items: [
              "Vào tab Chức năng, nhóm Phương tiện, chọn chức năng cần xem.",
              "Chọn xe, rồi chọn Từ ngày và Đến ngày.",
              "Bấm vào một chuyến hoặc một điểm dừng để mở bản đồ.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Chọn khoảng ngày quá dài thì bản đồ nhiều điểm, tải chậm. Xem theo từng ngày hoặc vài ngày cho nhẹ.",
          },
        ],
      },
    ],
  },
  {
    id: "dai-hoi-co-dong",
    title: "Đại hội cổ đông",
    summary: "Điểm danh và biểu quyết bằng cách quét QR cổ đông",
    iconName: "people-outline",
    iconBg: C.violet,
    group: "Theo dõi & báo cáo",
    keywords: ["dai hoi", "co dong", "diem danh", "bieu quyet", "y kien"],
    sections: [
      {
        id: "dhcd-diem-danh",
        heading: "Điểm danh cổ đông",
        blocks: [
          {
            kind: "steps",
            items: [
              "Mở chức năng Đại hội cổ đông, ở tab Điểm danh.",
              "Bấm nút quét để mở máy quét.",
              "Quét mã QR trên thư mời của cổ đông; app ghi nhận có mặt ngay.",
              "Quay lại tab Điểm danh để xem tỷ lệ tham dự và các mục Tất cả / Đã điểm danh / Chưa điểm danh.",
            ],
          },
        ],
      },
      {
        id: "dhcd-bieu-quyet",
        heading: "Biểu quyết",
        blocks: [
          {
            kind: "steps",
            items: [
              "Chuyển sang tab biểu quyết.",
              "Chọn Ý kiến cần lấy trong bảng chọn.",
              "Bấm quét rồi quét QR của từng cổ đông để ghi phiếu.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "Cổ đông chưa điểm danh thì quét biểu quyết sẽ bị từ chối. Phải điểm danh ở tab Điểm danh trước, rồi mới quét biểu quyết.",
          },
        ],
      },
    ],
  },

  // ─── Trợ giúp ──────────────────────────────────────────────────────────────
  {
    id: "cai-dat",
    title: "Cài đặt & quyền",
    summary: "Hồ sơ, mật khẩu, giao diện, quyền, phiên bản",
    iconName: "settings-outline",
    iconBg: C.amber,
    group: "Trợ giúp",
    keywords: ["cai dat", "quyen", "ho so", "doi mat khau", "giao dien", "sang toi", "phien ban", "dang xuat", "thong bao camera", "tam dung thong bao"],
    sections: [
      {
        id: "cai-dat-tai-khoan",
        heading: "Tài khoản",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Hồ sơ cá nhân: họ tên, email, đơn vị, phòng ban, bộ phận, tổ nhóm, chức vụ.",
              "Đổi mật khẩu: nhập mật khẩu cũ, mật khẩu mới và nhập lại mật khẩu mới.",
              "Đăng nhập FaceID (chỉ iPhone/iPad): bật để lần sau đăng nhập bằng khuôn mặt.",
            ],
          },
        ],
      },
      {
        id: "cai-dat-khac",
        heading: "Hiển thị và quyền",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Hiển thị: chọn giao diện Sáng, Tối, hoặc để app theo cài đặt của thiết bị.",
              "Quyền mạng nội bộ: cần có để kết nối máy chủ trong công ty.",
              "Quyền camera: cần có để quét QR và chụp ảnh xác nhận.",
              "Quyền thông báo: nhận thông báo từ hệ thống.",
              "Thông báo camera: tạm dừng thông báo phát hiện chuyển động trong một khoảng thời gian. Dòng này chỉ hiện với tài khoản được cấp quyền nhận thông báo camera.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Quyền đang ở trạng thái Đã chặn quyền thì app không xin lại được nữa — phải mở Cài đặt của điện thoại để bật. Bấm vào dòng quyền đó, app sẽ đưa bạn tới đúng chỗ.",
          },
        ],
      },
      {
        id: "cai-dat-phien-ban",
        heading: "Phiên bản ứng dụng",
        blocks: [
          {
            kind: "paragraph",
            text: "Khối THÔNG TIN ỨNG DỤNG cho biết phiên bản đang cài và tự kiểm tra có bản mới hay không. Khi có bản mới, nút Cập nhật hiện ra và mở thẳng App Store / Google Play.",
          },
          {
            kind: "paragraph",
            text: "Cuối danh sách là Đăng xuất — app hỏi xác nhận trước khi thoát khỏi tài khoản hiện tại.",
          },
        ],
      },
    ],
  },

  GUIDE_FAQ_TOPIC,
];

export const GUIDE_TOPICS: readonly GuideTopic[] = TOPICS;

const TOPIC_BY_ID = new Map<GuideTopicId, GuideTopic>(
  TOPICS.map((topic) => [topic.id, topic]),
);

export const getGuideTopic = (id: GuideTopicId): GuideTopic | undefined =>
  TOPIC_BY_ID.get(id);

/** Tên chủ đề, dùng làm tiêu đề header khi mở từ nút dấu hỏi. */
export const getGuideTopicTitle = (id: GuideTopicId): string =>
  TOPIC_BY_ID.get(id)?.title ?? "Hướng dẫn";
