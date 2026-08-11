#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
로컬 확인용 서버 — 배포에는 쓰이지 않습니다.

Render 는 site/ 폴더를 CDN 에서 그대로 서빙하므로 이 파일이 필요 없습니다.
푸시하기 전에 손으로 확인할 때만 씁니다.

    python3 serve.py            → http://localhost:8800/
    python3 serve.py 9000       → 포트 지정
    python3 serve.py 8800 all   → 같은 망의 다른 PC 에서도 접속 허용

파일을 더블클릭해서 열면 브라우저가 manifest.json 조회를 차단합니다.
반드시 이 서버를 통해 여십시오.
"""
import sys, os, http.server, socketserver, socket

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")

MIME = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
}


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return MIME.get(ext) or super().guess_type(path)

    def end_headers(self):
        # 파일을 바꿔 끼울 때 캐시가 남지 않도록 합니다.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        code = args[1] if len(args) > 1 else ""
        if str(code).startswith(("4", "5")):
            sys.stderr.write("  ! %s\n" % (fmt % args))


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


if __name__ == "__main__":
    if not os.path.isdir(ROOT):
        sys.exit("site/ 폴더가 없습니다. 저장소 루트에서 실행하십시오.")
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
    host = "0.0.0.0" if (len(sys.argv) > 2 and sys.argv[2] == "all") else "127.0.0.1"
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer((host, port), H) as s:
        print(f"  로후르 검토 사이트 (로컬 확인)  →  http://localhost:{port}/")
        if host == "0.0.0.0":
            ip = lan_ip()
            if ip:
                print(f"  같은 망에서                    →  http://{ip}:{port}/")
        print("  중지: Ctrl+C\n")
        try:
            s.serve_forever()
        except KeyboardInterrupt:
            print("\n  중지했습니다.")
