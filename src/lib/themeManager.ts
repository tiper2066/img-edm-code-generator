import { prism, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 테마 타입 정의
export type ThemeType = 'light' | 'dark';

// 테마 설정 인터페이스
export interface ThemeConfig {
  name: ThemeType;
  displayName: string;
  style: any; // react-syntax-highlighter 스타일 객체
}

// 사용 가능한 테마 목록
export const themes: ThemeConfig[] = [
  {
    name: 'light',
    displayName: '라이트',
    style: prism
  },
  {
    name: 'dark',
    displayName: '다크',
    style: vscDarkPlus
  }
];

// 기본 테마
export const DEFAULT_THEME: ThemeType = 'dark';

// 테마 이름으로 테마 설정 가져오기
export const getThemeConfig = (themeName: ThemeType): ThemeConfig => {
  const theme = themes.find(t => t.name === themeName);
  return theme || themes.find(t => t.name === DEFAULT_THEME)!;
};

// 테마 이름이 유효한지 확인
export const isValidTheme = (theme: string): theme is ThemeType => {
  return themes.some(t => t.name === theme);
};

// 테마 전환 로직
export class ThemeManager {
  private currentTheme: ThemeType = DEFAULT_THEME;
  private listeners: ((theme: ThemeType) => void)[] = [];

  constructor(initialTheme?: ThemeType) {
    if (initialTheme && isValidTheme(initialTheme)) {
      this.currentTheme = initialTheme;
    }
  }

  // 현재 테마 가져오기
  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  // 테마 변경
  setTheme(theme: ThemeType): void {
    if (isValidTheme(theme) && theme !== this.currentTheme) {
      this.currentTheme = theme;
      this.notifyListeners();
    }
  }

  // 테마 변경 리스너 등록
  addListener(listener: (theme: ThemeType) => void): void {
    this.listeners.push(listener);
  }

  // 테마 변경 리스너 제거
  removeListener(listener: (theme: ThemeType) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // 모든 리스너에게 테마 변경 알림
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTheme);
      } catch (error) {
        console.warn('Theme listener error:', error);
      }
    });
  }

  // 테마 토글 (라이트 ↔ 다크)
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
}