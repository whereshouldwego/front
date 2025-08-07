# 여기갈래 - 그룹 식사 장소 결정 플랫폼

그룹 식사 장소를 쉽게 결정할 수 있는 플랫폼입니다. 카카오맵 API를 활용하여 사용자 위치 기반 맛집을 추천하고, 투표 기능을 통해 그룹 식사 장소를 결정할 수 있습니다.

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Map**: Kakao Map API
- **Authentication**: Kakao OAuth

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수들을 설정하세요:

```env
# 카카오맵 API 키 (REST API 키)
VITE_KAKAO_REST_API_KEY=여기에_카카오_REST_API_키를_입력하세요

# 카카오 로그인 설정
VITE_KAKAO_CLIENT_ID=여기에_카카오_앱_키를_입력하세요
VITE_KAKAO_REDIRECT_URI=http://localhost:5173/auth/kakao/callback

# 백엔드 API 서버 주소
VITE_API_URL=http://localhost:8080
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

## 주요 기능

- **맛집 검색**: 카카오맵 API를 활용한 위치 기반 맛집 검색
- **맛집 추천**: AI 기반 개인화 맛집 추천
- **투표 시스템**: 그룹 식사 장소 투표 및 결정
- **찜하기**: 관심 맛집 저장 및 관리
- **채팅**: AI 챗봇을 통한 맛집 추천 대화
- **카카오 로그인**: 소셜 로그인 지원

## 📁 프로젝트 구조 및 협업 가이드

### **폴더 구조**
```
src/
├── components/          # React 컴포넌트
│   ├── sidebar/        # 사이드바 관련 컴포넌트
│   ├── map/            # 지도 관련 컴포넌트
│   ├── ui/             # 공통 UI 컴포넌트
│   ├── layout/         # 레이아웃 컴포넌트
│   ├── chat/           # 채팅 관련 컴포넌트
│   └── auth/           # 인증 관련 컴포넌트
├── stores/             # 전역 상태 관리 (Zustand)
├── lib/                # API 모듈 및 외부 서비스
├── hooks/              # 커스텀 React 훅
├── utils/              # 유틸리티 함수
├── constants/          # 상수 정의
├── types/              # TypeScript 타입 정의
├── data/               # 정적 데이터
├── assets/             # 프로젝트 자산
├── App.tsx             # 메인 앱 컴포넌트
├── main.tsx            # 앱 진입점
├── index.css           # 전역 스타일
├── App.css             # 앱 스타일
└── vite-env.d.ts       # Vite 타입 정의

1. components/ - React 컴포넌트
  sidebar/: 사이드바 토글, 패널, 네비게이션
  map/: 카카오맵 컨테이너, 오버레이, 로더
  ui/: 공통 UI (RestaurantCard 등)
  layout/: 앱 레이아웃, 반응형 래퍼
  chat/: 채팅 섹션, 메시지 관리
  auth/: 카카오 로그인 모달
2. stores/ - 전역 상태 관리
  SidebarContext.tsx: 사이드바 상태, 검색 결과, 패널 관리
  ChatContext.tsx: 채팅 메시지, AI 응답, 로딩 상태
3. lib/ - API 및 외부 서비스
  api.ts: 카카오맵 API, 검색 API, 기타 백엔드 연동
4. hooks/ - 커스텀 React 훅
  useSearch.ts: 검색 로직, 디바운스, 히스토리 관리
5. utils/ - 유틸리티 함수
  search.ts: 검색 유틸리티, 거리 계산, 필터링
6. constants/ - 상수 정의
  sidebar.ts: 패널 설정, 버튼 설정, API 상수
7. types/ - TypeScript 타입
  index.ts: 모든 타입 정의 (Restaurant, User, API 등)
8. data/ - 정적 데이터
  restaurantData.ts: 샘플 레스토랑 데이터
9. assets/ - 프로젝트 자산
  react.svg: React 로고 (기본)
```

### **📋 협업 규칙**

#### **1. 파일 네이밍 규칙**
```typescript
// 컴포넌트: PascalCase
RestaurantCard.tsx
KakaoLoginModal.tsx

// 훅: camelCase + use 접두사
useSearch.ts
useKakaoLoader.tsx

// 유틸리티: camelCase
searchUtils.ts
formatUtils.ts

// 상수: UPPER_SNAKE_CASE
API_ENDPOINTS.ts
ERROR_MESSAGES.ts
```

#### **2. 컴포넌트 구조 규칙**
```typescript
// 1. 주석 (파일 설명)
/**
 * ComponentName.tsx
 * 
 * 컴포넌트 설명
 * 
 * 기능:
 * - 주요 기능 1
 * - 주요 기능 2
 * 
 * Props:
 * - prop1: 설명
 * - prop2: 설명
 */

// 2. 타입 정의
interface ComponentProps {
  // props 타입 정의
}

// 3. 컴포넌트 구현
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 구현
};

export default ComponentName;
```

#### **3. 상태 관리 규칙**
```typescript
// 전역 상태는 stores 폴더에
// src/stores/SidebarContext.tsx

// 로컬 상태는 컴포넌트 내부에
const [localState, setLocalState] = useState();

// 커스텀 훅은 hooks 폴더에
// src/hooks/useSearch.ts
```

#### **4. 스타일링 규칙**
```typescript
// 1. Tailwind CSS 우선 사용
className="bg-white rounded-lg shadow-md p-4"

// 2. 복잡한 스타일은 CSS Module 사용
import styles from './ComponentName.module.css';
className={styles.customClass}

// 3. 전역 스타일은 styles 폴더에
// src/styles/global.css
```

### **🔧 개발 환경 설정**

#### **필수 확장 프로그램**
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **TypeScript Importer**
- **Prettier - Code formatter**

#### **VS Code 설정**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### **🚀 개발 워크플로우**

#### **1. 새 기능 개발**
```bash
# 1. 브랜치 생성
git checkout -b feature/새기능명

# 2. 개발 작업
# - 해당 담당 폴더에서 작업
# - 컴포넌트 생성 시 index.ts 업데이트

# 3. 커밋
git add .
git commit -m "feat: 새기능 추가"

# 4. PR 생성
git push origin feature/새기능명
```

#### **2. 컴포넌트 생성 시 체크리스트**
- [ ] 파일명이 PascalCase인가?
- [ ] 주석이 포함되어 있는가?
- [ ] 타입이 정의되어 있는가?
- [ ] index.ts에 export가 추가되었는가?
- [ ] 스타일이 적용되어 있는가?

#### **3. API 연동 시 체크리스트**
- [ ] lib 폴더에 API 함수가 정의되었는가?
- [ ] 에러 처리가 포함되어 있는가?
- [ ] 로딩 상태가 관리되고 있는가?
- [ ] 타입이 정의되어 있는가?

### **📚 유용한 참고 자료**

#### **내부 문서**
- `src/types/index.ts` - 전체 타입 정의
- `src/constants/` - 상수 및 설정값
- `src/utils/` - 공통 유틸리티 함수

#### **외부 문서**
- [React 공식 문서](https://react.dev/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Zustand 문서](https://github.com/pmndrs/zustand)
- [카카오맵 API 문서](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

## 빌드

```bash
npm run build
```