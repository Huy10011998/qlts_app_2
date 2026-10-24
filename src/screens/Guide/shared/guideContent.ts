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
    title: "Đăng nhập, Face ID & vân tay",
    summary: "Đăng nhập, bật Face ID / vân tay / khoá màn hình, xử lý khi hết phiên",
    iconName: "log-in-outline",
    iconBg: C.blue,
    group: "Bắt đầu",
    keywords: ["dang nhap", "login", "mat khau", "faceid", "face id", "van tay", "khuon mat", "sinh trac", "khoa man hinh", "mau hinh", "ma pin", "mo khoa", "mang noi bo"],
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
              "Vào tab Cài đặt → Tài khoản → bật Đăng nhập FaceID và xác thực khuôn mặt khi máy hỏi.",
              "Lần sau mở app, máy tự hỏi Face ID ngay ở màn Đăng nhập, không phải nhập lại mật khẩu. Lỡ bỏ qua thì bấm nút Face ID cạnh nút Đăng nhập.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Nút Face ID bị mờ, bấm vào báo \"FaceID chưa bật\" là tài khoản này chưa bật Face ID ở Cài đặt → Tài khoản trên máy đang dùng (hoặc vừa đăng xuất). Đăng nhập bằng mật khẩu rồi bật lại. Ô tài khoản luôn điền sẵn tên đăng nhập lần trước.",
          },
          {
            kind: "paragraph",
            text: "Face ID chỉ có trên iPhone/iPad. Máy Android xem mục vân tay / khoá màn hình bên dưới.",
          },
        ],
      },
      {
        id: "dang-nhap-van-tay",
        heading: "Máy Android: bật vân tay / khuôn mặt hoặc khoá màn hình",
        blocks: [
          {
            kind: "paragraph",
            text: "Mặc định máy Android đã đăng nhập thì mở app là vào thẳng. Bật vân tay / khuôn mặt hoặc khoá màn hình (mẫu hình, mã PIN hoặc mật khẩu của điện thoại) thì mỗi lần mở lại app phải mở khoá mới vào được, người khác cầm máy không vào được.",
          },
          {
            kind: "steps",
            items: [
              "Cài vân tay, khuôn mặt hoặc khoá màn hình trong Cài đặt của điện thoại trước.",
              "Đăng nhập app bằng tài khoản và mật khẩu.",
              "Vào tab Cài đặt → Tài khoản → bật Đăng nhập bằng vân tay / khuôn mặt hoặc Đăng nhập bằng khoá màn hình. Bật cả hai cũng được.",
              "Chạm vân tay, nhìn vào màn hình hoặc vẽ mẫu hình / nhập mã PIN khi máy hỏi. App báo \"Đã bật đăng nhập bằng …!\" là xong.",
            ],
          },
          {
            kind: "paragraph",
            text: "App chỉ hiện mục mà điện thoại dùng được:",
          },
          {
            kind: "bullets",
            items: [
              "Đăng nhập bằng vân tay / khuôn mặt: máy đã cài ít nhất một vân tay hoặc khuôn mặt. Máy chỉ có một loại thì mục ghi đúng loại đó, vd \"Đăng nhập bằng vân tay\".",
              "Đăng nhập bằng khoá màn hình: máy chạy Android 11 trở lên và đã đặt mẫu hình, mã PIN hoặc mật khẩu.",
              "Vừa cài vân tay / khuôn mặt / khoá màn hình trên điện thoại mà chưa thấy mục: thoát màn Cài đặt của app rồi vào lại.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Máy có cả vân tay lẫn khuôn mặt (vd Samsung Galaxy S23): khi hỏi, điện thoại tự nhận cách đã cài trên máy — nhìn vào màn hình hoặc chạm vân tay. Hộp hỏi trông thế nào do điện thoại quyết định, mỗi hãng một kiểu.",
          },
        ],
      },
      {
        id: "dang-nhap-mo-app-android",
        heading: "Máy Android: mở app bằng vân tay / khuôn mặt hoặc khoá màn hình",
        blocks: [
          {
            kind: "steps",
            items: [
              "Mở lại app (sau khi vuốt tắt app hoặc khởi động lại máy). App dừng ở màn Đăng nhập, không tự hiện hộp hỏi.",
              "Bấm nút cạnh nút Đăng nhập: hình vân tay (hình khuôn mặt nếu máy chỉ có khuôn mặt), hoặc hình mẫu hình nếu chỉ bật khoá màn hình.",
              "Chạm vân tay, nhìn vào màn hình, hoặc vẽ mẫu hình / nhập mã PIN. Đúng là vào app.",
            ],
          },
          {
            kind: "bullets",
            items: [
              "Bật cả hai: hộp hỏi vân tay / khuôn mặt có thêm nút chuyển sang mẫu hình / mã PIN. Chữ trên nút do điện thoại ghi, mỗi hãng một kiểu.",
              "Muốn dùng mật khẩu: cứ nhập Tài khoản, Mật khẩu rồi bấm Đăng nhập như thường. Hộp hỏi đang mở thì bấm Dùng mật khẩu, hoặc bấm ra ngoài hộp / nút Quay lại để đóng.",
              "Đang dùng mà ra màn hình chính rồi quay lại app thì vào tiếp luôn, không hỏi.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Nút mờ, bấm vào báo \"… chưa bật\" (vd \"Vân tay hoặc khoá màn hình chưa bật\") là máy này chưa bật mục đó ở Cài đặt → Tài khoản, hoặc vừa đăng xuất. Đăng nhập bằng mật khẩu rồi bật lại.",
          },
          {
            kind: "note",
            tone: "warn",
            text: "Bấm Đăng xuất thì cả vân tay / khuôn mặt lẫn khoá màn hình đều tắt theo. Xoá hết vân tay và khuôn mặt hoặc gỡ khoá màn hình của điện thoại thì app tự tắt mục tương ứng. Đăng nhập bằng mật khẩu rồi bật lại.",
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
              "Camera: hệ thống camera theo khu vực. Tài khoản dùng Workflow thấy tab Lịch ở chỗ này — xem chủ đề Lịch công việc.",
              "Cài đặt: chia 5 nhóm Tài khoản, Hỗ trợ, Hệ thống, Thông tin ứng dụng, Khác — gồm hồ sơ, danh thiếp QR, mật khẩu, quyền, giao diện, cỡ chữ và tài liệu hướng dẫn này.",
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
              "Dấu ba chấm: thao tác quản trị bản ghi (Bản sao, Xoá). Việc nghiệp vụ như Đánh giá không nằm trong đây: vuốt dòng ở danh sách, hoặc dùng thanh dưới đáy màn khi quét QR.",
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
    summary: "Số liệu, Truy cập nhanh, sắp xếp và thu gọn các khối",
    iconName: "home-outline",
    iconBg: C.emerald,
    group: "Bắt đầu",
    keywords: [
      "trang chu",
      "home",
      "truy cap nhanh",
      "tuy chinh",
      "sap xep",
      "diem danh",
      "so lieu",
      "thiet bi may moc",
      "thiet bi cntt",
      "bam o so lieu",
      "chuong",
      "thong bao",
      "tong quan cong viec",
      "dashboard",
      "hoan tat trong nam",
      "thu gon",
      "an khoi",
      "di toi khoi",
    ],
    sections: [
      {
        id: "trang-chu-khoi",
        heading: "Các khối trên Trang chủ",
        blocks: [
          {
            kind: "bullets",
            items: [
              "SỐ LIỆU TOÀN CÔNG TY: số thiết bị máy móc, thiết bị CNTT, camera đang hoạt động, số người đã điểm danh hôm nay. Ô có mũi tên › bấm được để xem chi tiết — xem mục bên dưới.",
              "TRUY CẬP NHANH: các chức năng bạn tự ghim.",
              "TỔNG QUAN CÔNG VIỆC (tài khoản có quyền Workflow), giống Home trên web: % công việc đã hoàn tất trong năm; số việc Tháng hiện tại so với tháng trước (vd +200%); Quá hạn (tháng này) / Chưa đến hạn / Hoàn tất trễ hạn / Hoàn tất đúng hạn kèm thanh tỉ lệ; cột 6 tháng gần nhất (Công việc · Hoàn thành) — bấm một tháng để xem số của tháng đó. Bấm Xem chi tiết để mở danh sách công việc.",
              "Cơ cấu tài sản: lật qua từng trang để xem tỷ lệ.",
              "ĐIỂM DANH NHÂN SỰ HÔM NAY: đang làm việc / đã điểm danh / chưa điểm danh. Nhiều phòng ban thì khối hiện sẵn 5 phòng ban có tỉ lệ điểm danh thấp nhất (tỉ lệ tô đỏ khi dưới 50%, cam khi dưới 80%); bấm Xem tất cả để thấy đủ, bấm một phòng ban để xem danh sách người.",
              "Các khối tiêu thụ: điện, điện mặt trời, nước cấp, nước thải, hơi — mỗi dòng tách số của nhà máy Vĩnh Lộc và Bến Lức.",
            ],
          },
          {
            kind: "paragraph",
            text: "Mỗi khối có một nhãn màu riêng ở đầu khối, card trong khối có viền cùng màu với nhãn. Riêng ô ở TRUY CẬP NHANH viền theo loại mục: hồng là chức năng, xanh là phương tiện, tím là báo cáo. Hàng nút tròn ngay dưới đầu trang (Số liệu, Truy cập nhanh, Công việc...) luôn nằm trên cùng khi cuộn: bấm một nút để tới thẳng khối đó.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Số liệu trên Trang chủ hiện theo quyền Dashboard Tài sản IT cấp cho tài khoản: Máy móc (ô thiết bị máy móc và hai trang cơ cấu, tăng trưởng máy móc), Thiết bị CNTT (ô thiết bị CNTT và trang cơ cấu CNTT), Camera (ô camera), Điểm danh nhân sự (ô đã điểm danh và khối điểm danh), Tiêu thụ điện / nước / hơi (khối tiêu thụ). Thiếu quyền nào thì phần đó không hiện, không phải app lỗi — cần xem thì nhờ IT cấp.",
          },
          {
            kind: "paragraph",
            text: "Hình chuông trên thanh đầu Trang chủ là thông báo của phiếu đề nghị, công việc và kế hoạch — xem mục Chuông thông báo bên dưới. Việc Workflow đang chờ bạn thì xem bằng nút Việc cần xử lý (hình bảng kẹp giấy có dấu tích) ngay cạnh chuông.",
          },
        ],
      },
      {
        id: "trang-chu-chuong",
        heading: "Chuông thông báo",
        blocks: [
          {
            kind: "paragraph",
            text: "Số trên chuông là số thông báo bạn chưa đọc. Bấm chuông để xem 20 thông báo mới nhất; bấm Xem tất cả ở cuối bảng để mở màn Thông báo với đầy đủ thông báo cũ hơn.",
          },
          {
            kind: "bullets",
            items: [
              "Có thông báo khi: phiếu chờ bạn duyệt hoặc gửi bạn để biết; phiếu bạn lập hoàn tất, bị từ chối, bị trả bước hoặc có bình luận; bạn được giao việc hay đổi vai trò; việc chuyển trạng thái, được gia hạn, có bình luận, sắp tới hạn (trong 24 giờ) hoặc vừa quá hạn; bạn được thêm vào kế hoạch, kế hoạch bạn chủ trì có việc mới.",
              "Thông báo chưa đọc có nền xanh nhạt, tiêu đề đậm và chấm xanh bên phải. Bấm một thông báo để đánh dấu đã đọc và mở luôn phiếu, công việc hoặc kế hoạch đó.",
              "Ở màn Thông báo, hàng tab trên cùng lọc theo Phiếu / Công việc / Kế hoạch; bật Chỉ chưa đọc để ẩn thông báo đã xem. Đánh dấu tất cả đã đọc (có ở cả bảng chuông) đưa số trên chuông về 0.",
              "Đang mở app thì thông báo mới hiện ngay (trễ vài giây): một khung nhỏ nổi trên đầu màn hình, bấm vào để mở luôn. Đọc ở máy khác hay trên web thì số trên chuông cũng giảm theo.",
              "App tắt hoặc đang chạy nền thì thông báo hiện trên điện thoại như tin nhắn. Bấm vào để mở luôn phiếu, việc hoặc kế hoạch đó, và thông báo được tính là đã đọc. Đọc trong app thì thông báo đó cũng tự biến khỏi danh sách thông báo của điện thoại.",
              "Số trên biểu tượng app ở màn hình chính bằng số trên chuông. iPhone luôn hiện đúng số này. Android thì điện thoại tự đếm các thông báo đang nằm trong danh sách thông báo, nên app thêm một dòng Thông báo chưa đọc để bù cho đủ số. Bấm Xoá danh sách thông báo thì biểu tượng hết số, chỉ đếm lại từ thông báo mới; đọc hết thông báo thì dòng đó mới hiện lại khi có thông báo chưa đọc. Một số máy Android (như Pixel) chỉ hiện chấm, không hiện số.",
              "Việc do chính bạn làm không tạo thông báo cho bạn. Thông báo đã đọc quá 180 ngày sẽ tự xoá.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Mở thông báo mà báo Không tìm thấy là phiếu / việc đó đã bị xoá, hoặc bạn không còn quyền xem.",
          },
        ],
      },
      {
        id: "trang-chu-o-so-lieu",
        heading: "Bấm vào ô số liệu",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Máy móc đang quản lý: mở màn Tài sản nhưng chỉ hiện đúng nhánh thiết bị máy móc, tiêu đề thanh đỏ đổi theo tên nhánh.",
              "Thiết bị CNTT đang dùng: mở nhóm IT (thiết bị CNTT đã chuyển từ nhóm Tài sản sang nhóm này), chỉ hiện nhánh CNTT. Số trên ô chưa gồm camera — camera đếm riêng ở ô khác.",
              "Đã điểm danh hôm nay: trượt xuống khối ĐIỂM DANH NHÂN SỰ HÔM NAY ngay trên Trang chủ, nơi có số theo từng phòng ban.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Muốn xem cả cây thì vào từ tab Chức năng như bình thường: máy móc ở nhóm Tài sản, CNTT ở nhóm IT. Khối điểm danh đang thu gọn thì bấm ô Đã điểm danh hôm nay sẽ tự mở khối ra; khối đang ẩn ở Sắp xếp thì ô này không bấm được.",
          },
          {
            kind: "paragraph",
            text: "Ô không có mũi tên › là tài khoản chưa có quyền xem chức năng đó, bấm vào không mở gì.",
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
            text: "Lựa chọn lưu theo tài khoản trên máy này: hai người dùng chung một máy không đè lựa chọn của nhau, nhưng đăng nhập sang máy khác thì phải ghim lại.",
          },
        ],
      },
      {
        id: "trang-chu-sap-xep",
        heading: "Đổi thứ tự, ẩn và thu gọn khối",
        blocks: [
          {
            kind: "steps",
            items: [
              "Bấm Sắp xếp (nút mũi tên lên xuống) trên đầu Trang chủ.",
              "Giữ và kéo một khối lên hoặc xuống để đổi vị trí.",
              "Bấm nút tròn bên phải của khối nào không muốn thấy nữa (nút có dấu tích là khối đang hiện, dấu cộng là đang ẩn) — khối đó biến khỏi Trang chủ. Bấm lại để hiện lại.",
            ],
          },
          {
            kind: "paragraph",
            text: "Khối vẫn muốn giữ nhưng ít xem thì bấm vào nhãn màu ở đầu khối để thu gọn — chỉ còn dòng tiêu đề, cạnh đó ghi Đã thu gọn. Bấm nhãn lần nữa để mở lại.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Thứ tự, khối ẩn và khối thu gọn lưu theo tài khoản trên máy này, không ảnh hưởng người khác. Lỡ ẩn hết các khối thì Trang chủ hiện nút Mở Sắp xếp để bật lại.",
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
            text: "Quét phải mã không phải tem tài sản thì app báo Mã này không phải tem tài sản và không mở gì cả. Tem đúng mà báo Không tìm thấy tài sản là tài sản đó có thể đã bị xoá. Bấm OK là quét tiếp được.",
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
      "o chon mo",
      "o chon xam",
      "khong bam duoc",
      "cap tren",
      "cap cha",
      "khu toa nha tang phong",
      "dien san",
      "tu dien",
      "gia tri mac dinh",
      "khong sua duoc",
      "o anh",
      "chup anh",
      "anh nhan vien",
      "ho so nhan vien",
      "nhan su",
      "hr",
      "cat lai",
      "hoan tac",
      "tim trong bang chon",
      "the danh sach",
      "dong trong",
      "ma qr",
      "nhom thong tin",
      "nhay toi nhom",
      "tab chi tiet",
      "lich su",
      "tep dinh kem",
      "file",
      "khong ho tro hien thi",
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
              "Loại tài sản có cây danh mục thì bấm ô hình phễu (ghi Tất cả hoặc tên danh mục đang chọn) cạnh ô tìm kiếm để lọc theo một nhánh; bấm dấu × trên ô đó để bỏ lọc.",
              "Bấm vào một dòng để mở màn chi tiết.",
            ],
          },
          {
            kind: "paragraph",
            text: "Thẻ ở danh sách chỉ hiện những trường đã có giá trị, để lướt tìm cho nhanh; trường còn trống vẫn xem đủ ở màn chi tiết. Loại hồ sơ có ảnh hoặc mã QR (ví dụ hồ sơ nhân viên) thì ảnh và mã QR nằm ở cột bên phải thẻ — bấm vào ảnh để xem lớn.",
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
            text: "Thanh tab dưới thanh đỏ chia màn chi tiết thành các mục. Mục đang mở hiện cả chữ, các mục khác chỉ hiện biểu tượng; số đỏ trên biểu tượng cho biết trong mục có bao nhiêu dòng, chấm đỏ ở Note là bản ghi có ghi chú.",
          },
          {
            kind: "bullets",
            items: [
              "Thông tin: các trường của bản ghi, xếp theo nhóm. Bấm tiêu đề nhóm để gập hoặc mở. Trường chưa có giá trị hiện ---.",
              "Chi tiết: các danh mục liên quan của bản ghi (phiếu đánh giá, bản ghi con…).",
              "Note: ghi chú của bản ghi.",
              "Lịch sử: các lần bản ghi được sửa; bấm một dòng để xem Chi tiết lịch sử.",
              "Tệp: file đính kèm. Ảnh (PNG, JPG) và PDF xem ngay trong app; loại file khác như Word, Excel thì app báo Không hỗ trợ hiển thị file này — mở file đó trên web bằng máy tính.",
            ],
          },
          {
            kind: "paragraph",
            text: "Bản ghi có từ hai nhóm thông tin trở lên thì ngay dưới thanh tab có hàng nút tên nhóm (ví dụ Thông tin chung, Vị trí, Kỹ thuật), luôn nằm trên cùng khi cuộn. Bấm một nút để tới thẳng nhóm đó — nhóm đang gập tự mở ra; nút của nhóm đang xem tô đỏ.",
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
            text: "Quét QR ra thiết bị thì đáy màn chi tiết có thanh làm việc với thiết bị. Đây là chỗ ghi nhận đánh giá, kiểm kê, báo hỏng… — không còn nằm trong dấu ba chấm nữa.",
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
            text: "Mở thiết bị từ danh sách tài sản thì không có thanh này: tab Chi tiết đã có đủ các danh mục con, còn muốn thêm nhanh thì vuốt dòng ngay ở danh sách. Riêng tủ lạnh nội địa thì mở từ đâu cũng có thanh với Xác nhận vị trí và Trung chuyển.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Quét QR mà không thấy thanh nghĩa là loại tài sản chưa khai danh mục con nào, hoặc tài khoản không có quyền thêm bản ghi con.",
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
              "Xem lại những ô app đã điền sẵn — form mở ra thường có vài ô có giá trị ngay.",
              "Điền các ô bắt buộc; ô nào chọn từ danh mục thì bấm vào để mở bảng chọn.",
              "Bấm lưu. Bản ghi mới hiện ngay trong danh sách.",
            ],
          },
          {
            kind: "paragraph",
            text: "Ô điền sẵn là giá trị mặc định do bộ phận quản lý khai cho từng loại tài sản: ngày nhập lấy ngày hôm nay, đơn vị tiền tệ lấy loại hay dùng nhất… Đây là giá trị gợi ý, sửa lại được bình thường trước khi lưu.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Mở màn Chỉnh sửa hay Bản sao thì app KHÔNG điền sẵn gì — giữ nguyên giá trị của bản ghi đang sửa, hoặc của bản ghi gốc đang nhân bản.",
          },
          {
            kind: "bullets",
            items: [
              "Bấm ô chọn là bảng chọn mở ngay; trong lúc tải danh sách, bảng hiện mấy dòng xám. Mất mạng thì bảng báo Không thể tải dữ liệu — bấm Thử lại khi có mạng.",
              "Trong bảng chọn, gõ vào ô tìm kiếm để lọc — chỉ còn những dòng khớp chữ vừa gõ.",
              "Giá trị đang chọn luôn được đưa lên đầu danh sách (ngay dưới dòng bỏ chọn), kể cả khi danh sách dài nhiều trang. Tích thêm trong lúc đang xem thì dòng giữ nguyên chỗ, không nhảy.",
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
        id: "tai-san-o-anh",
        heading: "Ô ảnh trong bản ghi",
        blocks: [
          {
            kind: "paragraph",
            text: "Một số loại hồ sơ (ví dụ hồ sơ nhân viên) có ô ảnh lưu thẳng trong bản ghi. Ở danh sách và màn chi tiết, ảnh hiện thu nhỏ; bấm vào để xem lớn. Ở Chi tiết lịch sử, lần nào đổi ảnh thì hiện cả ảnh cũ → ảnh mới.",
          },
          {
            kind: "bullets",
            items: [
              "Chụp ảnh: chụp mới bằng camera.",
              "Thư viện: chọn ảnh có sẵn trong máy.",
              "Cắt lại: chỉnh khung của ảnh đang có.",
              "Xoá: bỏ ảnh khỏi ô.",
            ],
          },
          {
            kind: "paragraph",
            text: "Dưới ảnh ghi Ảnh đã lưu (xx KB), hoặc Chưa có ảnh. Đang sửa mà đổi ý thì bấm Hoàn tác về ảnh gốc để lấy lại ảnh lúc mở form.",
          },
        ],
      },
      {
        id: "tai-san-o-chon-cap-tren",
        heading: "Ô chọn theo cấp trên: phải chọn từ trên xuống",
        blocks: [
          {
            kind: "paragraph",
            text: "Một số ô chỉ có nghĩa khi biết cấp trên của nó, ví dụ chuỗi Khu → Toà nhà → Tầng → Phòng. Những ô này phải chọn lần lượt từ trên xuống.",
          },
          {
            kind: "bullets",
            items: [
              "Chưa chọn đủ cấp trên thì ô nằm dưới bị làm mờ, bấm không mở, và ghi sẵn câu nhắc — ví dụ Vui lòng chọn Toà nhà, Tầng trước.",
              "Chọn xong cấp trên là ô kế tiếp tự mở ra, danh sách bên trong đã lọc theo đúng cấp trên vừa chọn.",
              "Đổi lại một cấp trên thì các ô bên dưới nó bị xoá về trống — vì giá trị cũ thuộc cấp trên khác. Chọn lại từ đó xuống.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "App khoá ô thay vì cho bấm rồi hiện danh sách trống: thiếu một cấp trên thì máy chủ trả về danh sách của những mục không thuộc cấp nào, chọn vào là lưu sai chỗ mà không có báo lỗi nào.",
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
            kind: "paragraph",
            text: "Danh mục đang thêm mà có cấp trên (thêm một Phòng, trong lúc form ngoài đã chọn Khu / Toà nhà / Tầng) thì form thêm nhanh điền sẵn đúng chuỗi cấp trên đó và để mờ, không sửa được. Nhờ vậy bản ghi mới nằm đúng chỗ và hiện ngay trong danh sách sau khi lưu.",
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
            kind: "paragraph",
            text: "Form thêm bản ghi con điền sẵn các ô chỉ ra bản ghi cha và để mờ, không sửa được — ví dụ thêm bình chữa cháy trong một phòng thì Khu, Toà nhà, Tầng, Phòng đã có sẵn. Cố ý khoá: sửa tay mấy ô đó là bản ghi con nhảy sang một thiết bị khác.",
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
            text: "Ảnh phải chụp trực tiếp bằng camera, app không cho chọn ảnh có sẵn trong thư viện — đây là ảnh làm bằng chứng. Ảnh được tự đóng dấu thời điểm chụp, địa chỉ nơi chụp (kèm toạ độ chữ nhỏ bên dưới) và tên người chụp. Không có mạng thì chỉ có toạ độ, không có địa chỉ.",
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

  // ─── Công việc & phê duyệt ─────────────────────────────────────────────────
  {
    id: "phieu-de-nghi",
    title: "Phiếu đề nghị",
    summary: "Lập phiếu, duyệt / từ chối, xem quy trình duyệt",
    iconName: "document-text-outline",
    iconBg: C.violet,
    group: "Công việc & phê duyệt",
    keywords: [
      "workflow",
      "phieu de nghi",
      "ticket",
      "ticket phong ban",
      "flow",
      "lap phieu",
      "duyet",
      "phe duyet",
      "tu choi",
      "khong y kien",
      "tra buoc",
      "ly do tra buoc",
      "duyet tat ca",
      "duyet nhieu",
      "chon nhieu",
      "nguoi duyet",
      "quy trinh",
      "so do",
      "luu nhap",
      "nhan ban",
      "dinh kem",
      "binh luan",
      "tao cong viec",
      "giao viec",
      "viec can xu ly",
      "xem tat ca",
    ],
    sections: [
      {
        id: "phieu-mo-workflow",
        heading: "Mở Workflow",
        blocks: [
          {
            kind: "steps",
            items: [
              "Vào tab Chức năng, chọn ô Workflow. Hay dùng thì ghim ô này lên khối TRUY CẬP NHANH ở Trang chủ.",
              "Màn Workflow chia hai nhóm: Flow có Ticket phòng ban — phiếu đề nghị theo quy trình duyệt; Công việc có Công việc và Kế hoạch.",
              "Chọn Ticket phòng ban để vào danh sách phiếu.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-01.png"),
            caption: "Màn Workflow: số nhắc dưới tên từng chức năng",
            aspectRatio: 0.78,
          },
          {
            kind: "paragraph",
            text: "Dưới tên mỗi chức năng là các số giống số trên tab khi mở vào: Ticket phòng ban có chờ duyệt, đang xử lý, nháp; Công việc có chưa xong, đến hạn (hạn là hôm nay), quá hạn, gia hạn, mới hôm nay. Số 0 thì không hiện. Số chưa xong đã gồm cả việc đến hạn, quá hạn và gia hạn. Kéo màn hình xuống để cập nhật số.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Không thấy ô Workflow, hoặc vào thì báo \"Bạn không có quyền truy cập\" là tài khoản chưa được cấp quyền xem Workflow. Vào được mà báo \"Chưa có chức năng\" là chưa được cấp quyền xem phiếu đề nghị, công việc hay kế hoạch. Cả hai đều nhờ IT cấp.",
          },
        ],
      },
      {
        id: "phieu-viec-can-xu-ly",
        heading: "Việc cần xử lý",
        blocks: [
          {
            kind: "paragraph",
            text: "Trên thanh đầu Trang chủ, cạnh hình chuông có nút Việc cần xử lý (hình bảng kẹp giấy có dấu tích). Bấm vào để xem phiếu đang chờ bạn duyệt, việc được giao, việc sắp đến hạn, việc quá hạn và bình luận mới. Số trên nút cũng là số đỏ trên ô Workflow.",
          },
          {
            kind: "bullets",
            items: [
              "Hàng tab trên cùng lọc theo loại: Tất cả, Phiếu chờ duyệt, Được giao, Sắp đến hạn, Quá hạn, Bình luận. Chỉ hiện những loại đang có việc.",
              "Bấm một dòng để mở thẳng phiếu, danh sách phiếu chờ duyệt, hoặc công việc liên quan.",
              "Phiếu chờ duyệt của cùng một loại phiếu gộp thành một dòng, ví dụ \"3 phiếu Ticket phòng ban đang chờ bạn duyệt\".",
              "Số chỉ giảm khi việc được xử lý — duyệt phiếu, làm xong việc — chứ không phải khi bạn đã xem. Kéo màn hình xuống để tải lại.",
              "Nút chỉ có ở tài khoản được cấp quyền Workflow.",
            ],
          },
        ],
      },
      {
        id: "phieu-danh-sach",
        heading: "Danh sách phiếu",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Chờ duyệt (mở sẵn): phiếu đang tới lượt bạn duyệt.",
              "Đang xử lý, Đã hoàn tất: phiếu đang đi qua các bước, và phiếu đã xong.",
              "Nháp: phiếu bạn đã lưu nháp, chưa nộp.",
              "Hồ sơ của tôi: phiếu do bạn lập. Tất cả: mọi phiếu bạn được xem.",
            ],
          },
          {
            kind: "paragraph",
            text: "Gõ vào ô Tìm kiếm phiếu... để lọc. Mỗi thẻ có nhãn tình trạng tô màu (Nháp, Chờ duyệt, Đang xử lý, Đã hoàn tất, Đã từ chối, Đã hủy), tên bước hiện tại (bước có nhiều phòng duyệt song song thì ghi tên bước lớn) — chữ đỏ khi tới lượt bạn — và số bình luận, số file đính kèm. Bấm thẳng vào số bình luận, số file hay nút tròn hình sơ đồ cạnh đó để mở màn Bình luận, File đính kèm hay Quy trình của phiếu đó, khỏi vào chi tiết phiếu. Số file mờ đi giống nút Đính kèm ở chi tiết khi phiếu chưa có file mà bạn không thêm được.",
          },
          {
            kind: "paragraph",
            text: "Phiếu tới lượt bạn (tên bước chữ đỏ): vuốt thẻ sang trái để hiện các nút Trả bước / Từ chối / Không ý kiến / Duyệt, không phải mở chi tiết. Tab Chờ duyệt có dải nhắc màu đỏ nhạt ngay dưới các tab, giống danh sách tài sản. Nút Không ý kiến và Trả bước chỉ có ở bước cho phép. Phiếu chưa tới lượt bạn thì vuốt không ra nút nào.",
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-02.png"),
            caption: "Tab Chờ duyệt: dải nhắc vuốt, nút Duyệt nhiều (n) và tên bước chữ đỏ khi tới lượt bạn",
            aspectRatio: 0.74,
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-02-vuot.png"),
            caption: "Vuốt thẻ sang trái: hiện nút Từ chối / Duyệt — bước cho phép thì có thêm Trả bước, Không ý kiến",
            aspectRatio: 1.67,
          },
        ],
      },
      {
        id: "phieu-lap",
        heading: "Lập phiếu",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ở danh sách phiếu, bấm nút + màu đỏ ở góc dưới để mở màn Lập phiếu.",
              "Chọn Loại đề nghị, nhập Tiêu đề và Mô tả. Ô có dấu * đỏ là bắt buộc.",
              "Ở mục Đính kèm, bấm Chọn file nếu cần gửi kèm: Chụp ảnh, Ảnh trong máy hoặc Tài liệu (PDF, Word, Excel...). Ảnh chụp bằng Chụp ảnh được tự đóng dấu thời điểm chụp, địa chỉ nơi chụp (kèm toạ độ) và tên người chụp; ảnh chọn trong máy giữ nguyên.",
              "Mục Người duyệt hiện ra sau khi chọn Loại đề nghị (nếu loại đó cần chọn người). Bấm vào từng bước để chọn người; mỗi bước phải có ít nhất 1 người, thiếu thì app báo Thiếu người duyệt và tô đỏ bước còn trống.",
              "Bấm Lưu phiếu để nộp đi duyệt, hoặc Lưu nháp để giữ lại sửa tiếp.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-03.png"),
            caption: "Màn Lập phiếu: Lưu nháp để giữ lại, Lưu phiếu để nộp đi duyệt",
            aspectRatio: 0.46,
          },
          {
            kind: "bullets",
            items: [
              "Mỗi file tối đa 20MB. File được tải lên khi lưu, không phải lúc chọn.",
              "Phiếu nháp nằm ở tab Nháp. Mở ra bấm Sửa để sửa tiếp, rồi Lưu phiếu khi đã xong.",
              "Nộp không được thì app báo Chưa nộp được kèm lý do — phiếu vẫn được giữ ở dạng nháp, không mất.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Không thấy nút + hoặc màn báo \"Chưa liên kết nhân viên\": tài khoản phải được gắn với một hồ sơ nhân viên trên hệ thống mới lập được phiếu. Liên hệ IT.",
          },
        ],
      },
      {
        id: "phieu-duyet",
        heading: "Duyệt, từ chối, không ý kiến",
        blocks: [
          {
            kind: "steps",
            items: [
              "Bấm Duyệt (xanh), Từ chối (đỏ) hoặc Không ý kiến (xám xanh) — ở danh sách thì vuốt thẻ sang trái cho hiện nút, hoặc ở thanh nút dưới đáy màn Chi tiết phiếu (thanh này chỉ hiện khi tới lượt bạn).",
              "Ghi Ý kiến. Duyệt thì để trống cũng được; Từ chối thì nên ghi lý do.",
              "Bước kế tiếp cần chọn người thì bảng hiện thêm mục Chọn người duyệt cho bước kế tiếp — phải chọn mỗi bước ít nhất 1 người.",
              "Bấm nút xác nhận ở cuối bảng. Làm ở màn Chi tiết phiếu thì xong là app báo Đã duyệt phiếu… (hoặc Đã từ chối…) ở dưới màn và quay về danh sách.",
            ],
          },
          {
            kind: "note",
            tone: "warn",
            text: "Từ chối sẽ đóng phiếu, không quay lại được. App hỏi xác nhận một lần trước khi gửi. Lỡ từ chối nhầm thì người lập phải lập phiếu mới — dùng Nhân bản cho nhanh. Chỉ cần bước trước làm lại thì dùng Trả bước.",
          },
          {
            kind: "paragraph",
            text: "Phiếu duyệt song song: người khác vừa duyệt, trả bước hay từ chối trước bạn thì app báo \"Phiếu không còn chờ bạn xử lý...\" rồi tự tải lại, nút Duyệt tự ẩn.",
          },
        ],
      },
      {
        id: "phieu-tra-buoc",
        heading: "Trả bước",
        blocks: [
          {
            kind: "paragraph",
            text: "Trả bước đưa phiếu lùi về bước trước để làm lại, thay vì từ chối đóng phiếu. Nút Trả bước màu cam, đứng trước Từ chối, chỉ có ở bước cho phép trả bước.",
          },
          {
            kind: "steps",
            items: [
              "Vuốt thẻ sang trái rồi bấm Trả bước, hoặc bấm ở màn Chi tiết phiếu.",
              "Hộp Xác nhận trả bước ghi phiếu đang ở bước nào và sẽ về bước nào.",
              "Nhập Lý do trả bước — bắt buộc — rồi bấm Trả bước.",
            ],
          },
          {
            kind: "bullets",
            items: [
              "Trả bước tính theo bước lớn: phiếu lùi về bước lớn liền trước và chạy lại từ đầu bước đó. Bấm ở bước con 2.2 cũng về bước 1, không về 2.1.",
              "Các bước con đang mở cùng bước (song song) cũng dừng, chạy lại sau. Người ở các bước bị chạy lại phải duyệt lại.",
              "Bước lớn đầu tiên không trả được. Chọn nhiều phiếu thì không có Trả bước — làm từng phiếu.",
            ],
          },
        ],
      },
      {
        id: "phieu-tao-cong-viec",
        heading: "Bước cuối: Duyệt hay Tạo công việc",
        blocks: [
          {
            kind: "paragraph",
            text: "Với loại đề nghị có giao việc, ở lượt duyệt cuối bảng duyệt có hai lựa chọn:",
          },
          {
            kind: "bullets",
            items: [
              "Duyệt: duyệt phiếu như thường.",
              "Tạo công việc: duyệt phiếu và giao việc luôn — từ đó tình trạng phiếu đi theo công việc. Bấm xong app mở màn Tạo công việc, đã điền sẵn từ phiếu.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-04.png"),
            caption: "Lượt duyệt cuối của loại có giao việc: chọn Duyệt hoặc Tạo công việc",
            aspectRatio: 0.99,
          },
          {
            kind: "note",
            tone: "warn",
            text: "Ở màn Tạo công việc, bấm nút Tạo công việc ở cuối form mới là duyệt phiếu. Đóng form mà không lưu thì phiếu chưa được duyệt.",
          },
        ],
      },
      {
        id: "phieu-duyet-nhieu",
        heading: "Duyệt nhiều phiếu một lần",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ở tab Chờ duyệt, nhấn giữ một phiếu để bật chế độ chọn nhiều.",
              "Chạm thêm các phiếu khác, hoặc bấm Chọn hết. Thanh dưới đáy ghi Đã chọn x/y; bấm Huỷ để thoát.",
              "Bấm Duyệt nhiều (n), ghi Ý kiến chung rồi bấm Duyệt.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-05.png"),
            caption: "Đang chọn nhiều: thanh dưới ghi Đã chọn x/y, có Chọn hết, Huỷ và Duyệt nhiều (n)",
            aspectRatio: 0.46,
          },
          {
            kind: "paragraph",
            text: "Muốn duyệt hết danh sách thì bấm Duyệt nhiều (n) ngay dưới các tab (lúc chưa chọn phiếu nào) — duyệt mọi phiếu đang chờ bạn, không cần chọn từng phiếu.",
          },
          {
            kind: "bullets",
            items: [
              "Chọn nhiều chỉ để Duyệt. Từ chối, Không ý kiến và Trả bước phải làm từng phiếu.",
              "Mỗi lượt duyệt tối đa 500 phiếu. Còn nhiều hơn thì app báo và duyệt phần đầu; bấm Duyệt nhiều lần nữa cho phần còn lại.",
              "Phiếu đang ở lượt cuối có Tạo công việc: chọn Bỏ qua các phiếu này để duyệt riêng từng phiếu mà giao việc, hoặc Vẫn duyệt như thường (không tạo công việc).",
              "Phiếu cần chọn người duyệt cho bước tiếp theo sẽ chưa được duyệt — mở từng phiếu, chọn người rồi bấm Duyệt.",
            ],
          },
        ],
      },
      {
        id: "phieu-quy-trinh",
        heading: "Xem quy trình và lịch sử duyệt",
        blocks: [
          {
            kind: "paragraph",
            text: "Ở màn Chi tiết phiếu, bấm Quy trình (hoặc bấm nút tròn hình sơ đồ ngay trên thẻ ở danh sách). Màn có hai tab:",
          },
          {
            kind: "bullets",
            items: [
              "Quy trình: sơ đồ ngang từ Lập phiếu tới bước cuối, mỗi bước lớn một điểm. Xanh có dấu ✓ là Đã duyệt, xanh dương có số là Đang xử lý, viền đứt là Chờ xử lý, đỏ là Đã từ chối, cam là Trả bước. Bước có bước con ghi thêm chấm nhỏ cho từng con và số con đã xong, vd 1/2. Sơ đồ rộng thì vuốt ngang để xem.",
              "Phiếu từng bị trả bước thì sơ đồ có nhiều dòng: mỗi dòng là một lượt chạy, nối nhau bằng nét đứt cam ghi Trả bước. Bấm vào nhãn đó để chọn điểm bấm trả; giữ nhãn để xem nhanh trả từ bước nào về bước nào, ai trả, lúc nào và lý do.",
              "Bấm một điểm để xem chi tiết bên dưới: từng bước con, người xử lý, trạng thái, giờ và ý kiến. Điểm cam ghi thêm khung Trả bước: <bước được trả về>; người trả, giờ và lý do nằm ở dòng Trả bước trong bảng. Mở màn là app chọn sẵn bước đang xử lý.",
              "Lịch sử: từng việc đã xảy ra theo thời gian — Thêm mới (lập phiếu), Chờ xử lý (bước mở, giao cho ai), Duyệt / Từ chối / Không ý kiến kèm người và ý kiến, Bỏ qua, Trả bước kèm lý do, Tạo công việc.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/phieu-de-nghi-06.png"),
            caption: "Tab Quy trình: mỗi dòng một lượt chạy, nét đứt cam là trả bước; bấm một điểm để xem chi tiết bên dưới",
            aspectRatio: 0.46,
          },
          {
            kind: "paragraph",
            text: "Phiếu đã giao việc thì sơ đồ có thêm điểm Công việc ở cuối; bấm vào xem Chủ trì, Hạn và mở công việc đó.",
          },
        ],
      },
      {
        id: "phieu-thao-tac-khac",
        heading: "Bình luận, đính kèm, sửa, nhân bản, xoá",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Bình luận (n): trao đổi về phiếu. Ai xem được phiếu thì bình luận được — gõ vào ô Viết bình luận..., mỗi bình luận gửi kèm được 1 file. Ảnh chụp hay ảnh chọn từ máy hiện thẳng trong khung chat, bấm vào để xem to; file khác hiện tên file, bấm để mở.",
              "Đính kèm (n): xem và mở các file của phiếu. Chỉ người lập thêm hoặc xoá file được, và chỉ khi phiếu còn nháp.",
              "Sửa: chỉ có ở phiếu nháp của chính bạn.",
              "Nhân bản: tạo phiếu mới lấy sẵn nội dung phiếu đang xem.",
              "Xoá: chỉ người lập, khi phiếu chưa hoàn tất. App hỏi xác nhận — thao tác không hoàn tác được.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cong-viec",
    title: "Công việc & kế hoạch",
    summary: "Giao việc, cập nhật tiến độ, việc định kỳ, kế hoạch",
    iconName: "checkbox-outline",
    iconBg: C.blue,
    group: "Công việc & phê duyệt",
    keywords: [
      "workflow",
      "cong viec",
      "giao viec",
      "ke hoach",
      "chu tri",
      "phoi hop",
      "de biet",
      "nguoi tham gia",
      "chuyen trang thai",
      "hoan thanh",
      "huy",
      "gia han",
      "doi chu tri",
      "qua han",
      "den han",
      "dinh ky",
      "lap lai",
      "tien do",
      "file ket qua",
    ],
    sections: [
      {
        id: "cong-viec-danh-sach",
        heading: "Danh sách công việc",
        blocks: [
          {
            kind: "paragraph",
            text: "Vào Workflow → Công việc. Danh sách chỉ có việc của bạn: việc bạn tạo, hoặc có tên trong người tham gia.",
          },
          {
            kind: "bullets",
            items: [
              "Các tab: Chưa xong (mở sẵn), Đến hạn, Quá hạn, Gia hạn, Mới hôm nay, Tất cả, Đã hủy.",
              "Hàng chip màu bên dưới lọc thêm theo tình trạng: Quá hạn, Gia hạn, Đang xử lý, Mới, Hoàn thành, Hủy.",
              "Ô tìm kiếm tìm theo số, tiêu đề, mô tả.",
              "Mỗi thẻ ghi Chủ trì, số bình luận, số file; việc sinh từ lịch định kỳ ghi Định kỳ · lần n. Việc quá hạn hay đã gia hạn có thêm nhãn nhỏ Quá hạn / Gia hạn cạnh tình trạng. Bấm thẳng vào số bình luận hay số file để mở màn đó, khỏi vào chi tiết việc.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/cong-viec-01.png"),
            caption: "Hàng tab theo hạn, hàng chip màu để lọc; viền trái thẻ cùng màu với chip (đỏ là quá hạn)",
            aspectRatio: 0.54,
          },
        ],
      },
      {
        id: "cong-viec-them",
        heading: "Thêm công việc",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ở danh sách, bấm nút + màu đỏ để mở màn Thêm công việc.",
              "Nhập Tiêu đề (bắt buộc); chọn Loại công việc, Kế hoạch nếu việc thuộc một kế hoạch; ghi Mô tả; chọn mức Khẩn cấp và Quan trọng.",
              "Mục Thời gian: chọn Từ ngày và Đến ngày (có cả giờ). Dời Từ ngày qua khỏi Đến ngày thì Đến ngày tự dời theo, giữ nguyên thời lượng.",
              "Mục Người tham gia: chọn đúng 1 người Chủ trì, thêm người Phối hợp và Để biết nếu cần. Mỗi người chỉ giữ một vai trò. Bảng chọn người tìm được theo tên, mã, phòng ban.",
              "Mục Đính kèm: chọn file nếu cần (tối đa 20MB mỗi file).",
              "Bấm Lưu. App báo đã lưu ở dưới màn và quay về danh sách.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Đang nhập dở mà bấm quay lại (hoặc vuốt về), app hỏi Bỏ thay đổi? — chọn Ở lại để làm tiếp. Áp dụng cho form công việc, phiếu, kế hoạch và tài sản.",
          },
          {
            kind: "paragraph",
            text: "Công tắc Không được chuyển người chủ trì: bật thì chủ trì không tự đổi chủ trì được. Chỉ người tạo việc đổi được ô này.",
          },
        ],
      },
      {
        id: "cong-viec-dinh-ky",
        heading: "Công việc định kỳ",
        blocks: [
          {
            kind: "paragraph",
            text: "Việc lặp lại đều đặn (kiểm tra hằng tuần, báo cáo hằng tháng…) thì tạo một lần, app sinh sẵn đủ các lần.",
          },
          {
            kind: "steps",
            items: [
              "Ở màn Thêm công việc, mục Định kỳ, bật Lặp lại định kỳ.",
              "Chọn Ngày / Tuần / Tháng / Năm và Lặp mỗi bao nhiêu. Lặp theo tuần thì chọn thêm thứ (T2 … CN).",
              "Chọn Ngày bắt đầu.",
              "Ở Kết thúc, chọn Sau số lần (tối đa 366) hoặc Vào ngày.",
              "Xem dòng Sẽ tạo n công việc… bên dưới để chắc ngày các lần là đúng, rồi bấm Lưu.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/cong-viec-02.png"),
            caption: "Ví dụ: lặp T2, T4, T6 mỗi tuần, 6 lần — dòng xem trước liệt kê đủ 6 ngày",
            aspectRatio: 0.46,
          },
          {
            kind: "bullets",
            items: [
              "Giờ và thời lượng mỗi lần lấy theo Từ ngày / Đến ngày ở mục Thời gian.",
              "Định kỳ chỉ có khi thêm mới. Sửa một việc đã có, hoặc tạo việc từ phiếu đề nghị, thì không có mục này.",
              "File đính kèm của việc định kỳ chỉ gắn vào lần đầu.",
            ],
          },
        ],
      },
      {
        id: "cong-viec-cap-nhat",
        heading: "Cập nhật tiến độ",
        blocks: [
          {
            kind: "paragraph",
            text: "Mở một việc để vào màn Chi tiết công việc. Các nút ở đây tuỳ vai trò của bạn trong việc:",
          },
          {
            kind: "bullets",
            items: [
              "Chuyển trạng thái: chọn Mới, Đang xử lý, Hoàn thành hoặc Hủy; ghi chú tiến độ, gắn File kết quả. Hủy bắt buộc ghi lý do.",
              "Gia hạn: chọn Hạn mới và ghi lý do. Việc đã gia hạn hiện thêm dòng Hạn ban đầu.",
              "Đổi chủ trì: chọn chủ trì mới và ghi lý do bàn giao.",
              "Sửa, Xoá: Xoá chỉ có khi việc còn Mới, do bạn tạo và không sinh từ phiếu.",
              "Bình luận (n), File (n): trao đổi và gửi file trong việc. Không có quyền trao đổi thì màn bình luận ghi Bạn chỉ xem được bình luận.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/cong-viec-03.png"),
            caption: "Bảng Chuyển trạng thái: chọn trạng thái mới, ghi chú, gắn File kết quả rồi Lưu",
            aspectRatio: 0.89,
          },
          {
            kind: "paragraph",
            text: "Tab Thông tin có Người tham gia chia theo Chủ trì / Phối hợp / Để biết, và phần Định kỳ nếu có. Tab Lịch sử ghi lại từng lần tạo, chuyển trạng thái, gia hạn, đổi chủ trì.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Thấy dòng \"Bạn đang xem ở chế độ chỉ xem.\" là bạn chỉ được xem việc này, không làm gì được trên nó. Việc ghi Sinh từ phiếu đề nghị thì không xoá được; muốn bỏ việc thì Chuyển trạng thái → Hủy.",
          },
        ],
      },
      {
        id: "cong-viec-ke-hoach",
        heading: "Kế hoạch",
        blocks: [
          {
            kind: "paragraph",
            text: "Kế hoạch gom nhiều công việc về một mối để theo dõi phần trăm hoàn thành. Vào Workflow → Kế hoạch.",
          },
          {
            kind: "bullets",
            items: [
              "Các tab: Tất cả, Tôi chủ trì, Tôi tham gia.",
              "Bấm nút + để Thêm kế hoạch. Chủ trì là người tạo kế hoạch, không cần chọn; chỉ chọn thêm người tham gia.",
              "Màn chi tiết có vòng tiến độ x/y việc. Tab Công việc liệt kê các việc trong kế hoạch; bấm Thêm công việc để tạo việc đã gắn sẵn vào kế hoạch này.",
              "Không phải chủ trì thì tab Công việc chỉ hiện việc bạn tham gia.",
              "Mỗi thẻ việc trong kế hoạch có số bình luận, số file — bấm thẳng vào để mở màn Bình luận / File của việc đó, như ở danh sách Công việc.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Chỉ chủ trì kế hoạch mới thấy nút Sửa và Xoá. Nút Xoá bị mờ khi kế hoạch còn công việc — chỉ xoá được kế hoạch không còn việc nào.",
          },
        ],
      },
    ],
  },
  {
    id: "lich-thong-bao",
    title: "Lịch công việc",
    summary: "Tab Lịch công việc của Workflow",
    iconName: "calendar-outline",
    iconBg: C.sky,
    group: "Công việc & phê duyệt",
    keywords: [
      "lich",
      "lich cong viec",
      "tab lich",
      "thang",
      "tuan",
      "hom nay",
      "phieu cho duyet",
      "duoc giao",
      "sap den han",
      "qua han",
      "binh luan",
      "mat tab camera",
    ],
    sections: [
      {
        id: "lich-tab",
        heading: "Tab Lịch thay chỗ tab Camera",
        blocks: [
          {
            kind: "paragraph",
            text: "Tài khoản được cấp quyền Workflow sẽ thấy tab Lịch ở thanh dưới, đúng chỗ tab Camera cũ. Camera không mất: vẫn mở từ ô Camera ở tab Chức năng.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Lúc mới mở app, tab có thể hiện Camera trong giây lát rồi đổi thành Lịch. Đó là lúc app vừa tải xong quyền của tài khoản, không phải lỗi.",
          },
        ],
      },
      {
        id: "lich-xem",
        heading: "Xem lịch công việc",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Chọn Tháng hoặc Tuần ở trên cùng. Bấm Hôm nay để về ngày hiện tại; mũi tên hai bên để sang tháng / tuần trước hoặc sau.",
              "Xem theo Tháng: bấm một ngày trên lưới, thẻ của ngày đó hiện ngay bên dưới. Xem theo Tuần: mỗi ngày một thẻ xếp dọc.",
              "Thẻ ngày có ô ngày bên trái (thứ và số ngày; hôm nay tô đỏ, có thêm chữ Hôm nay), dòng ghi số việc hoặc Chưa có việc, và nút + bên phải. Việc của ngày xếp bên dưới, viền mỗi việc theo màu tình trạng.",
              "Trên lưới Tháng, mỗi việc là một vạch màu dưới ngày, màu theo tình trạng. Hàng chip màu lọc theo tình trạng như ở danh sách công việc.",
              "Bấm một việc để mở chi tiết công việc.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/lich-thong-bao-01.png"),
            caption: "Xem theo Tháng: bấm một ngày, việc của ngày đó hiện bên dưới lưới",
            aspectRatio: 0.46,
          },
          {
            kind: "paragraph",
            text: "Bấm nút + trên thẻ một ngày để thêm việc cho ngày đó — ngày chưa có việc thì bấm vào đâu trên thẻ cũng được. Form điền sẵn từ 08:00 đến 17:00, chủ trì là bạn, sửa lại được.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Đầu màn thêm việc ghi rõ ngày đang tạo (ví dụ THỨ 4, 21/10/2026), để biết mình đang thêm việc cho ngày nào. Đổi Từ ngày trong form thì dòng này đổi theo.",
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
      "phat lai",
      "phong to",
      "zoom",
      "toan man hinh",
      "chup anh",
      "thong bao",
      "noti",
      "ai",
      "phat hien doi tuong",
      "chay khoi",
      "hut thuoc",
      "chuyen dong",
      "tam dung",
      "bao dong",
      "dau ghi",
      "rieng mot camera",
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
              "Ở lưới, chạm hai lần vào một ô để phóng ô đó ra toàn màn hình; chạm hai lần nữa để trở về lưới.",
              "Đang toàn màn hình thì vuốt trái/phải để chuyển sang camera kế tiếp, hoặc xoay ngang máy cho hình lớn hơn.",
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
        id: "camera-phat-lai",
        heading: "Xem lại (Phát lại)",
        blocks: [
          {
            kind: "paragraph",
            text: "Muốn xem chuyện đã xảy ra chứ không phải hình đang chiếu, dùng nút Phát lại ở thanh dưới màn Live View — nó mở bản ghi của đúng camera đang chọn.",
          },
          {
            kind: "steps",
            items: [
              "Mở Live View Camera, chạm chọn camera cần xem.",
              "Bấm nút Phát lại ở thanh dưới màn hình.",
              "Chọn ngày và giờ cần xem; kéo thanh thời gian để tới nhanh đoạn mong muốn.",
              "Đổi tốc độ tua nếu muốn xem nhanh hơn hay chậm lại.",
            ],
          },
          {
            kind: "bullets",
            items: [
              "Bật toàn màn hình rồi chụm hai ngón để phóng to hình, kéo để xem phần bị che; thu nhỏ hết cỡ là hình tự trở về như cũ.",
              "Nút hình máy ảnh ở thanh dưới màn Live View chụp lại khung hình đang xem và lưu vào máy.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Chụm hai ngón chỉ phóng to được khi đang ở chế độ toàn màn hình. Đang xem ở khung nhỏ thì thao tác này không có tác dụng.",
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
        heading: "Thông báo AI phát hiện",
        blocks: [
          {
            kind: "paragraph",
            text: "Hệ thống nhận dạng hình ảnh theo dõi các camera được bật; phát hiện thì app hiện thông báo kèm tên camera, vị trí và thời điểm. Có ba loại: phát hiện đối tượng, phát hiện cháy khói và phát hiện hút thuốc — tiêu đề thông báo ghi rõ loại nào.",
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
              "Sự kiện dồn dập thì thông báo cũng dồn theo — hệ thống không gộp giúp. Đang thi công hay có việc làm camera báo liên tục thì dùng Tạm dừng thông báo.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Không nhận được thông báo nào thì kiểm tra ba chỗ: Cài đặt → Hệ thống của app còn hiện dòng Thông báo camera không (không hiện là tài khoản chưa được IT cấp quyền), Quyền thông báo đã ở trạng thái Đã cấp quyền chưa, và có ai đang đặt tạm dừng không.",
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
              "Vào tab Cài đặt → Hệ thống, chọn Thông báo camera.",
              "Ở ô Áp dụng cho, để nguyên Tất cả camera, hoặc bấm vào để chọn đúng một camera cần tắt.",
              "Điền lý do — không bắt buộc, nhưng nên có để sau này biết ai tắt và vì sao.",
              "Bấm một trong bốn mốc 15 phút, 30 phút, 1 giờ hoặc 4 giờ.",
              "Hết giờ app tự nhận thông báo trở lại; muốn nhận sớm hơn thì bấm Bật lại ngay.",
            ],
          },
          {
            kind: "paragraph",
            text: "Khối trên cùng cho biết đang nhận hay đang tạm dừng, còn bao lâu, ai tắt, lý do và lệnh đang áp cho tất cả camera hay riêng một camera. Đặt mốc mới cùng phạm vi với lệnh đang chạy thì mốc cũ bị thay chứ không cộng dồn.",
          },
          {
            kind: "note",
            tone: "warn",
            text: "Khối TẮT CHO CẢ CÔNG TY viền đỏ ở cuối màn áp dụng cho MỌI NGƯỜI, không riêng bạn — app hỏi xác nhận trước khi tắt. Bốn nút phía trên chỉ tắt cho riêng bạn. Ô Áp dụng cho dùng chung cho cả hai khối: đang chọn một camera thì bấm nút đỏ là tắt camera đó cho cả công ty.",
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
    keywords: ["bao cao", "report", "dien mat troi", "solar", "san luong", "loc", "nhan su", "hr", "dieu kien", "tim trong bang chon"],
    sections: [
      {
        id: "bao-cao-xem",
        heading: "Mở một báo cáo",
        blocks: [
          {
            kind: "steps",
            items: [
              "Vào tab Chức năng, cuộn tới nhóm Báo cáo.",
              "Chọn báo cáo cần xem. Trong lúc app tải cấu hình báo cáo, thẻ vừa bấm quay vòng nhỏ thay cho mũi tên — chờ một chút, không cần bấm lại.",
              "Bấm nút lọc để chọn điều kiện (khoảng thời gian, đơn vị…).",
              "Kéo màn hình xuống để tải lại số liệu mới nhất.",
            ],
          },
          {
            kind: "bullets",
            items: [
              "Điều kiện chọn từ danh sách dài (phòng ban, nhân viên…): gõ vào ô tìm kiếm trong bảng chọn để lọc, chỉ còn những dòng khớp chữ vừa gõ.",
              "Những giá trị đã chọn luôn nằm trên đầu bảng, mở lại lần sau vẫn thấy ngay, không phải cuộn tìm.",
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
    keywords: ["phuong tien", "xe", "hanh trinh", "dung do", "vi tri", "ban do", "gps", "phong to", "thu nho", "xuat phat", "ket thuc", "mau diem dung"],
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
      {
        id: "phuong-tien-ban-do",
        heading: "Thao tác trên bản đồ",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Nút + và − ở góc trái trên để phóng to, thu nhỏ; chụm hai ngón cũng được.",
              "Trên iPhone có thêm nút ngay bên dưới: ở Hành trình và Dừng đỗ là thu cả tuyến vào khung; ở Vị trí hiện tại là đưa bản đồ về đúng chỗ xe.",
              "Hành trình: chấm xanh là Xuất phát, chấm đỏ là Kết thúc.",
              "Dừng đỗ: màu chấm theo thời gian dừng — đỏ là trên 30 phút, cam là trên 10 phút, xanh là ngắn hơn. Bấm vào chấm để xem địa chỉ và thời gian Dừng.",
              "Vị trí hiện tại: tự cập nhật mỗi 5 giây, không cần kéo tải lại.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "iPhone dùng bản đồ Apple, Android dùng bản đồ riêng trong app, nên hai máy nhìn hơi khác nhau. Bản đồ trên iPhone trắng trơn thì cập nhật app lên bản mới nhất.",
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
    summary: "Tài khoản, hỗ trợ, hệ thống, thông tin ứng dụng, khác",
    iconName: "settings-outline",
    iconBg: C.amber,
    group: "Trợ giúp",
    keywords: ["cai dat", "quyen", "tai khoan", "ho tro", "he thong", "thong tin ung dung", "khac", "ho so", "doi mat khau", "giao dien", "sang toi", "phien ban", "dang xuat", "thong bao camera", "tam dung thong bao", "thong tin qrcode", "danh thiep", "van tay", "khoa man hinh", "mau hinh", "card visit", "vcard", "luu danh ba", "ma nhan vien", "anh dai dien", "doi anh", "avatar", "co chu", "chu to", "chu nho", "phong chu"],
    sections: [
      {
        id: "cai-dat-nhom",
        heading: "Các nhóm cài đặt",
        blocks: [
          {
            kind: "paragraph",
            text: "Tab Cài đặt chia thành 5 nhóm, bấm vào nhóm để mở các dòng cài đặt bên trong. Dòng chữ nhỏ dưới tên nhóm cho biết nhóm có gì. Đăng xuất nằm riêng ở cuối màn Cài đặt.",
          },
          {
            kind: "bullets",
            items: [
              "Tài khoản: hồ sơ cá nhân, danh thiếp QR, đổi mật khẩu, đăng nhập FaceID / vân tay / khoá màn hình.",
              "Hỗ trợ: tài liệu hướng dẫn sử dụng này và câu hỏi thường gặp.",
              "Hệ thống: quyền mạng nội bộ, camera, vị trí, thông báo và thông báo camera.",
              "Thông tin ứng dụng: phiên bản đang cài và bản mới trên store.",
              "Khác: hiển thị sáng / tối và cỡ chữ.",
              "Đăng xuất (cuối màn Cài đặt, ngoài các nhóm): app hỏi xác nhận trước khi thoát khỏi tài khoản hiện tại.",
            ],
          },
        ],
      },
      {
        id: "cai-dat-tai-khoan",
        heading: "Tài khoản",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Hồ sơ cá nhân: họ và tên, mã nhân viên, điện thoại, email, phòng ban, bộ phận, tổ đội, chức vụ cơ cấu, chức danh.",
              "Ảnh đại diện (ở đầu màn Hồ sơ cá nhân): Chụp ảnh hoặc chọn từ Thư viện, cắt khung vuông rồi bấm Xong là lưu ngay. Cắt lại để chỉnh khung ảnh đang có, Xoá để bỏ ảnh. Ảnh này cũng hiện trên web và danh thiếp.",
              "Thông tin QrCode: danh thiếp của bạn kèm mã QR để người khác lưu vào danh bạ — xem mục bên dưới.",
              "Đổi mật khẩu: nhập mật khẩu cũ, mật khẩu mới và nhập lại mật khẩu mới.",
              "Đăng nhập FaceID (iPhone/iPad): bật để lần sau mở app bằng khuôn mặt.",
              "Đăng nhập bằng vân tay / khuôn mặt, Đăng nhập bằng khoá màn hình (Android): bật để mỗi lần mở lại app phải chạm vân tay, nhìn vào màn hình hoặc vẽ mẫu hình / nhập mã PIN của máy. Máy không dùng được cách nào thì không hiện mục đó — xem chủ đề Đăng nhập.",
            ],
          },
        ],
      },
      {
        id: "cai-dat-danh-thiep",
        heading: "Danh thiếp QR (Thông tin QrCode)",
        blocks: [
          {
            kind: "paragraph",
            text: "Màn này dựng theo mặt sau card visit giấy: mã QR ở góc trên, họ tên, chức vụ, số điện thoại ở giữa, thông tin công ty ở dưới.",
          },
          {
            kind: "steps",
            items: [
              "Vào tab Cài đặt → Tài khoản, chọn Thông tin QrCode.",
              "Đưa màn hình cho người cần lưu liên hệ.",
              "Người đó mở camera có sẵn của điện thoại, quét mã QR — máy mở trang danh thiếp của bạn trên web.",
              "Trên trang đó có nút tải thẻ liên hệ (vCard) để lưu vào danh bạ, và nút đổi tiếng Việt / tiếng Anh.",
            ],
          },
          {
            kind: "paragraph",
            text: "Mã QR mang đường link tới trang danh thiếp, không chứa sẵn thẻ liên hệ như trước. Nhờ vậy thông tin cập nhật trên hệ thống là trang danh thiếp đổi theo, không phải in lại mã.",
          },
          {
            kind: "bullets",
            items: [
              "Bấm số điện thoại để gọi, bấm Email để soạn thư, bấm Website để mở trang công ty.",
              "Không thấy mã QR (chỉ còn tên): tài khoản chưa được gán hồ sơ nhân viên, hoặc hồ sơ chưa có trang danh thiếp — liên hệ IT.",
            ],
          },
          {
            kind: "note",
            tone: "info",
            text: "Quét bằng camera của điện thoại, không phải nút Quét QR trong app — nút đó chỉ đọc tem tài sản nên sẽ báo Mã này không phải tem tài sản.",
          },
          {
            kind: "note",
            tone: "info",
            text: "Hồ sơ và danh thiếp được tải một lần lúc đăng nhập. Vừa cập nhật thông tin trên hệ thống mà app chưa đổi thì đăng xuất rồi đăng nhập lại.",
          },
        ],
      },
      {
        id: "cai-dat-he-thong",
        heading: "Hệ thống",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Quyền mạng nội bộ (chỉ trên iPhone/iPad): cần có để kết nối máy chủ trong công ty.",
              "Quyền camera: cần có để quét QR và chụp ảnh xác nhận.",
              "Quyền vị trí: cần có để gắn toạ độ vào ảnh chụp (xác nhận tủ lạnh, ảnh đính kèm Workflow). Hiện Chỉ vị trí gần đúng thì vẫn gắn được nhưng sai số lớn — bấm vào dòng này để mở Cài đặt và bật vị trí chính xác.",
              "Quyền thông báo: nhận thông báo từ hệ thống.",
              "Thông báo camera: tạm dừng thông báo AI phát hiện trong một khoảng thời gian, cho tất cả camera hoặc riêng một camera. Dòng này chỉ hiện với tài khoản được cấp quyền nhận thông báo camera.",
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
        heading: "Thông tin ứng dụng",
        blocks: [
          {
            kind: "paragraph",
            text: "Nhóm Thông tin ứng dụng cho biết phiên bản đang cài và tự kiểm tra có bản mới hay không. Khi có bản mới, dòng Thông tin ứng dụng ở màn Cài đặt có nhãn Mới; mở vào sẽ thấy nút Cập nhật, bấm là mở thẳng App Store / Google Play.",
          },
        ],
      },
      {
        id: "cai-dat-khac",
        heading: "Khác",
        blocks: [
          {
            kind: "bullets",
            items: [
              "Hiển thị: chọn giao diện Sáng, Tối, hoặc để app theo cài đặt của thiết bị.",
              "Cỡ chữ: kéo thanh trượt giữa hai chữ A để chọn cỡ chữ cho toàn ứng dụng, từ 85% đến 150% (mặc định 100%). Đoạn mô tả và khối MẪU CHỮ đổi ngay theo để xem trước. App không theo cỡ chữ trong Cài đặt của điện thoại, chỉ theo thanh trượt này, và chỉ áp dụng trên máy đang dùng.",
            ],
          },
          {
            kind: "image",
            source: require("../../../assets/images/guide/cai-dat-01.png"),
            caption: "Màn Cỡ chữ: kéo thanh trượt, khối MẪU CHỮ đổi theo để xem trước",
            aspectRatio: 0.46,
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
