const PDFJS_VERSION = "2.14.305";
const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

/** Lề hai bên trang, tính bằng CSS px. */
const GUTTER = 12;

/**
 * Trang HTML xem PDF trong WebView.
 *
 * Mỗi trang được vẽ **vừa khít bề ngang khung xem**, không phải theo một hệ số
 * cố định của khổ trang PDF. Trước đây dùng `scale = 1.5` nên canvas rộng bằng
 * khổ trang × 1.5 (A4 ≈ 893px): rộng hơn khung thì `margin: auto` thành 0 và
 * trang dính lề trái, còn file khổ nhỏ lại vừa khung nên nằm giữa — cùng một
 * đoạn code cho ra hai kết quả khác nhau tuỳ khổ trang của file.
 *
 * Kèm theo:
 * - `<meta viewport>` để 1 CSS px = 1 px thiết bị; thiếu nó WebView lấy viewport
 *   ảo 980px và mọi phép canh giữa đều lệch.
 * - Vẫn cho phóng tới 5× để đọc chữ nhỏ trên tài liệu scan.
 * - Canvas được `appendChild` ngay trong vòng lặp rồi mới render, nên thứ tự
 *   trang luôn đúng; render bằng `.then()` như trước thì trang nào xong trước
 *   nằm trước.
 * - Bitmap nhân theo `devicePixelRatio` (chặn ở 3) cho nét, còn bề rộng CSS giữ
 *   đúng bề ngang khung.
 */
export const buildPdfViewerHtml = (base64Data: string) => `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes">
      <script src="${PDFJS_BASE}/pdf.min.js"></script>
      <style>
        html, body { margin:0; padding:0; background:#f1f2f4; }
        #container { padding:${GUTTER}px 0; }
        canvas {
          display:block;
          margin:0 auto ${GUTTER}px;
          max-width:100%;
          background:#fff;
          box-shadow:0 1px 4px rgba(0,0,0,0.18);
        }
        #fallback {
          margin:0;
          padding:24px 16px;
          font:15px -apple-system,system-ui,Roboto,sans-serif;
          color:#555;
          text-align:center;
        }
      </style>
    </head>
    <body>
      <div id="container"></div>
      <script>
        var pdfData = "${base64Data}";
        var pdfjsLib = window['pdfjs-dist/build/pdf'];
        var container = document.getElementById('container');

        function showFallback(message) {
          var p = document.createElement('p');
          p.id = 'fallback';
          p.textContent = message;
          container.appendChild(p);
        }

        if (!pdfjsLib) {
          showFallback('Không tải được bộ đọc PDF. Vui lòng kiểm tra kết nối mạng rồi mở lại.');
        } else {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_BASE}/pdf.worker.min.js';

          var cssWidth = document.documentElement.clientWidth - ${GUTTER} * 2;
          var dpr = Math.min(window.devicePixelRatio || 1, 3);

          pdfjsLib.getDocument({ data: atob(pdfData) }).promise.then(function (pdf) {
            var chain = Promise.resolve();

            for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              (function (num) {
                var canvas = document.createElement('canvas');
                container.appendChild(canvas);

                chain = chain
                  .then(function () { return pdf.getPage(num); })
                  .then(function (page) {
                    var base = page.getViewport({ scale: 1 });
                    var fit = cssWidth / base.width;
                    var viewport = page.getViewport({ scale: fit * dpr });

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.width = cssWidth + 'px';
                    canvas.style.height = base.height * fit + 'px';

                    return page.render({
                      canvasContext: canvas.getContext('2d'),
                      viewport: viewport,
                    }).promise;
                  });
              })(pageNum);
            }

            return chain;
          }).catch(function () {
            showFallback('Không mở được nội dung file này.');
          });
        }
      </script>
    </body>
  </html>
`;
