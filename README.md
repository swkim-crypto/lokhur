# 로후르 양수장 설계도면 검토 — 웹 서비스

루다키 지구 로후르-0/-1/-2/-3 관개구역 재건사업 실시설계(РП) 도면 정합성 검토 결과를
3D 뷰어와 검토자료로 묶은 정적 사이트입니다.

---

## 1. 배포 (Render 정적 사이트)

이 저장소를 GitHub 에 올리고 Render 대시보드에서 **New ▸ Blueprint** 로 연결하면
`render.yaml` 대로 배포됩니다. 빌드 단계가 없어 푸시 후 1분 이내에 반영됩니다.

블루프린트를 쓰지 않고 **New ▸ Static Site** 로 만들 때는 두 칸만 채웁니다.

| 항목 | 값 |
|:--|:--|
| Build Command | 비워 둠 |
| Publish Directory | `site` |

### 접근 제한 — 반드시 읽으십시오

**Render 정적 사이트에는 비밀번호를 걸 수 없습니다.** URL 을 아는 사람은 누구나 봅니다.
`render.yaml` 에 검색엔진 색인 차단(`X-Robots-Tag`)과 `robots.txt` 를 넣어 두었지만,
그건 검색 결과에 안 뜨게 할 뿐 접근을 막지는 못합니다.

미공개 실시설계 도면과 부적합 지적 사항입니다. 다음 중 하나를 택하십시오.

- **URL 을 공유하지 않고 관계자에게만 직접 전달** — 가장 간단하지만 보호 수준은 낮습니다.
- **Render Web Service 로 전환** — 뒤의 「부록: 인증이 필요해지면」 참고.
- **Cloudflare Access 를 앞에 세움** — 커스텀 도메인을 Cloudflare 에 두고
  이메일 OTP 를 걸면 정적 사이트 그대로 인증이 붙습니다.

저장소는 **비공개(private)** 로 두십시오. 배포 URL 이 공개인 것과 별개 문제입니다.

### 푸시하기 전 로컬 확인

```bash
python3 serve.py
# → http://localhost:8800/
```

`serve.py` 는 **로컬 확인 전용**입니다. Render 는 `site/` 를 CDN 에서 직접 서빙하므로
배포에는 쓰이지 않습니다.

> **파일을 더블클릭해서 열면 안 됩니다.**
> `file://` 로 열면 브라우저가 `manifest.json` 조회를 차단해 검토자료 버튼이 동작하지 않습니다.
> 3D 화면은 뜨지만 문서는 열리지 않습니다.

---

## 2. 구성

```
lokhur-review/                     ← 저장소 루트
├─ render.yaml                     Render 블루프린트 (배포 설정)
├─ serve.py                        로컬 확인용 서버 · 배포에는 쓰이지 않음
├─ README.md                       이 문서
├─ .gitignore
└─ site/                           ← 여기만 배포됩니다 (staticPublishPath)
   ├─ index.html                   포털 — 표고 단면 내비게이션 · 개소 카드 · 공통 패턴 14건
   ├─ robots.txt                   색인 차단
   ├─ assets/
   │  ├─ three.min.js              603 KB · 4개 뷰어가 공유 (원래는 각 뷰어에 중복 내장)
   │  ├─ docviewer.css             검토자료 모달 스타일 (.dk- 네임스페이스)
   │  └─ docviewer.js              매니페스트를 읽어 버튼·모달을 생성
   ├─ viewer/
   │  └─ lokhur-0.html … lokhur-3.html
   └─ docs/
      └─ lokhur-0/
         ├─ manifest.json          ← 문서 목록. 여기만 고치면 버튼이 늘어납니다
         ├─ lokhur0-brief-ru.pdf   원문 (Краткое описание)
         ├─ lokhur0-brief-ko.docx  한국어 번역본 원본
         └─ lokhur0-brief-ko.html  위 DOCX를 미리 변환해 둔 본문
```

`render.yaml`·`serve.py`·`README.md` 는 `site/` 밖에 있으므로 배포본에 포함되지 않습니다.

### 뷰어에 무엇이 바뀌었나

원본 3D 뷰어의 스크립트 3분할 구조(A. 데이터·패널 / B. three.js / C. 3D 장면)는
그대로 두고 두 가지만 손댔습니다.

1. **B 블록(three.js)을 외부 참조로 교체** — 4개 뷰어에 똑같은 603 KB가 중복 내장돼
   있었습니다. 코어 코드 md5가 4개 모두 일치하는 것을 확인하고 분리했습니다.
   전체 용량 2.5 MB → 0.8 MB, 두 번째 뷰어부터는 브라우저 캐시에서 바로 뜹니다.
2. **`</body>` 앞에 검토자료 스크립트 3줄 주입** — 기존 DOM·전역변수(`STATE`·`VIEW`·`EV`·`ISSUES`)는
   건드리지 않습니다. 문서 패널이 실패해도 3D는 정상 동작합니다.

---

## 3. 문서 추가·교체

`site/docs/<개소>/` 에 파일을 넣고 `manifest.json` 에 항목만 추가합니다.
**뷰어 HTML은 다시 빌드할 필요가 없습니다.**

```json
{
  "site": "lokhur-0",
  "label": "로후르-0",
  "updated": "2026-08-11",
  "documents": [
    {
      "id": "rfi-01",
      "title": "질의서 1차",
      "type": "pdf",
      "file": "lokhur0-rfi-01.pdf",
      "note": "2026-08-11 발신"
    }
  ]
}
```

| 필드 | 뜻 |
|:--|:--|
| `type` | `pdf` → 모달 안에서 바로 표시 / `html` → 본문을 읽어 삽입 / 그 밖 → 내려받기만 |
| `file` | 화면에 띄울 파일 |
| `download` | 내려받기 버튼이 가리킬 원본 (없으면 `file` 과 같음) |
| `note` | 도구줄 왼쪽에 뜨는 한 줄 설명 |

탭 순서는 배열 순서 그대로입니다.

### DOCX를 추가할 때

브라우저는 DOCX를 렌더하지 못합니다. 미리 HTML로 변환해 두십시오.

```bash
pip install mammoth --break-system-packages
python3 -c "
import mammoth,sys
with open(sys.argv[1],'rb') as f: r=mammoth.convert_to_html(f)
open(sys.argv[2],'w',encoding='utf-8').write(r.value)
print('경고',len(r.messages),'건')
" site/docs/lokhur-0/새문서.docx site/docs/lokhur-0/새문서.html
```

그리고 매니페스트에 `"type":"html", "file":"새문서.html", "download":"새문서.docx"` 로 넣습니다.
화면에서는 변환본을 보고, 내려받기는 원본 DOCX가 나갑니다.

머리글·바닥글·페이지 번호·복잡한 셀 병합은 변환에서 빠집니다.
발주처 제출본처럼 레이아웃이 그대로 보여야 하면 `libreoffice --headless --convert-to pdf`
로 PDF를 하나 더 만들어 `type:"pdf"` 로 등록하는 편이 안전합니다.

### 파일 이름

**ASCII 로만 지으십시오** (`lokhur0-rfi-01.pdf`). 화면에 보일 한글 제목은 `title` 에 씁니다.
한글 파일명은 서버·브라우저 조합에 따라 URL 인코딩이 깨집니다.

---

## 4. 부록: 인증이 필요해지면

정적 사이트로는 비밀번호를 걸 수 없습니다. 인증이 필요해지면 Render **Web Service**
로 바꾸는 것이 가장 빠릅니다. `serve.py` 에 두 가지만 더하면 됩니다.

1. 포트를 환경변수에서 받기 — `port = int(os.environ.get("PORT", 8800))`, 바인딩은 `0.0.0.0`
2. `H` 클래스에 Basic 인증 20줄 추가 — 계정은 환경변수로 주입

그리고 `render.yaml` 을 아래로 바꿉니다.

```yaml
services:
  - type: web
    name: lokhur-review
    runtime: python
    buildCommand: ""
    startCommand: python3 serve.py
    envVars:
      - key: LOKHUR_USER
        sync: false          # 대시보드에서 직접 입력
      - key: LOKHUR_PASS
        sync: false
```

무료 플랜은 15분 무접속 시 잠들었다가 다음 요청에 30초쯤 걸려 깨어납니다.
검토용으로는 감수할 만하지만, 발주처에 링크를 보낼 거라면 유료 플랜을 쓰십시오.

사내 서버에 직접 올릴 경우 nginx 설정 예시:

```nginx
server {
    listen 80;
    server_name lokhur.example.local;
    root /srv/lokhur-review/site;

    charset utf-8;
    auth_basic "Lokhur Review";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / { try_files $uri $uri/ =404; }
    location /assets/three.min.js { expires 30d; }
    location /docs/ { add_header Cache-Control "no-store"; }
}
```

---

## 5. 네이버웍스 드라이브 연동

이 사이트는 드라이브 API 를 직접 호출하지 않습니다. 토큰이 필요해서 정적 페이지만으로는
불가능하고, 프런트에 토큰을 심으면 안 되기 때문입니다.

권하는 방식은 **원본은 드라이브, 배포본은 이 폴더**입니다.
드라이브에서 버전 관리·공유를 하고, 확정된 개정본만 `site/docs/` 에 복사한 뒤 매니페스트의
`updated` 를 고칩니다.

굳이 API 로 붙이려면 백엔드 프록시가 하나 필요합니다.
`브라우저 → 자체 서버(토큰 보관·갱신) → NAVER WORKS Drive API → 파일 스트림 → 모달`.
이 경우 `docviewer.js` 의 `BASE` 를 프록시 경로로 바꾸고, 프록시가 매니페스트와 동일한
JSON 을 내주면 나머지는 그대로 동작합니다.

---

## 6. 브라우저

WebGL 만 있으면 됩니다. 외부 CDN 의존성은 0입니다.

- Chrome / Edge / Firefox — 3D·PDF·번역본 전부 정상
- Safari (특히 iOS) — 모달 안 PDF 표시가 불안정합니다. 도구줄의 **새 탭으로 열기**를 쓰십시오.
- 3D 가 실패해도 좌측 표고 스택과 우측 부적합 목록은 그대로 동작합니다.
