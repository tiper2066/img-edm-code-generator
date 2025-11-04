import { useState, useEffect, useCallback } from 'react';
import { ThemeType, DEFAULT_THEME, isValidTheme } from './themeManager';

// 로컬 스토리지 키
const THEME_STORAGE_KEY = 'codeTheme';

// 테마 관리 훅
export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeType>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  // 로컬 스토리지에서 테마 로드
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // 로컬 스토리지 접근 가능 여부 확인
        if (typeof Storage === 'undefined') {
          console.warn('localStorage is not supported');
          setStorageError('localStorage not supported');
          return;
        }

        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        
        if (savedTheme) {
          if (isValidTheme(savedTheme)) {
            setThemeState(savedTheme);
            setStorageError(null);
          } else {
            console.warn('Invalid theme found in localStorage:', savedTheme);
            // 잘못된 값이 저장된 경우 제거
            localStorage.removeItem(THEME_STORAGE_KEY);
            setStorageError('Invalid theme data removed');
          }
        }
      } catch (error) {
        console.warn('Failed to load theme from localStorage:', error);
        setStorageError(error instanceof Error ? error.message : 'Unknown storage error');
        // 에러 발생 시 기본 테마 사용
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // 테마 변경 함수
  const setTheme = useCallback((newTheme: ThemeType) => {
    if (!isValidTheme(newTheme)) {
      console.warn('Invalid theme:', newTheme);
      return;
    }

    setThemeState(newTheme);
    
    // 로컬 스토리지에 저장
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
      // 저장 실패해도 상태는 변경됨
    }
  }, []);

  // 테마 토글 함수
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isLoading,
    storageError
  };
};

// 로컬 스토리지 유틸리티 함수들
export const themeStorage = {
  // 테마 저장 (재시도 로직 포함)
  save: (theme: ThemeType, retries: number = 2): boolean => {
    if (!isValidTheme(theme)) {
      console.warn('Invalid theme provided for saving:', theme);
      return false;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 스토리지 사용 가능 여부 확인
        if (typeof Storage === 'undefined') {
          console.warn('localStorage is not available');
          return false;
        }

        localStorage.setItem(THEME_STORAGE_KEY, theme);
        
        // 저장 확인
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === theme) {
          return true;
        } else {
          throw new Error('Theme was not saved correctly');
        }
      } catch (error) {
        console.warn(`Failed to save theme (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        if (attempt === retries) {
          // 마지막 시도에서도 실패한 경우
          return false;
        }
        
        // 잠시 대기 후 재시도
        if (attempt < retries) {
          // 동기적으로 처리하기 위해 간단한 지연
          const start = Date.now();
          while (Date.now() - start < 100) {
            // 100ms 대기
          }
        }
      }
    }
    return false;
  },

  // 테마 로드 (검증 포함)
  load: (): ThemeType | null => {
    try {
      if (typeof Storage === 'undefined') {
        console.warn('localStorage is not available');
        return null;
      }

      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      
      if (!saved) {
        return null;
      }

      if (isValidTheme(saved)) {
        return saved;
      } else {
        console.warn('Invalid theme found in storage, removing:', saved);
        // 잘못된 데이터 제거
        localStorage.removeItem(THEME_STORAGE_KEY);
        return null;
      }
    } catch (error) {
      console.warn('Failed to load theme:', error);
      return null;
    }
  },

  // 테마 삭제
  remove: (): boolean => {
    try {
      if (typeof Storage === 'undefined') {
        console.warn('localStorage is not available');
        return false;
      }

      localStorage.removeItem(THEME_STORAGE_KEY);
      
      // 삭제 확인
      const check = localStorage.getItem(THEME_STORAGE_KEY);
      return check === null;
    } catch (error) {
      console.warn('Failed to remove theme:', error);
      return false;
    }
  },

  // 스토리지 사용 가능 여부 확인
  isAvailable: (): boolean => {
    try {
      if (typeof Storage === 'undefined') {
        return false;
      }

      // 테스트 쓰기/읽기/삭제
      const testKey = '__theme_storage_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      return false;
    }
  },

  // 스토리지 정리 (잘못된 데이터 제거)
  cleanup: (): boolean => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && !isValidTheme(saved)) {
        localStorage.removeItem(THEME_STORAGE_KEY);
        console.info('Cleaned up invalid theme data from storage');
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to cleanup theme storage:', error);
      return false;
    }
  }
};