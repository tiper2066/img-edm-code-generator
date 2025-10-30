import React, { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { html as beautifyHtml } from 'js-beautify';
import { ThemeType, getThemeConfig } from '@/lib/themeManager';

interface CodeViewerProps {
  code: string;                    // 표시할 HTML 코드
  language?: string;               // 언어 타입 (기본: 'html')
  showLineNumbers?: boolean;       // 줄번호 표시 여부
  theme?: ThemeType;               // 테마 선택
  maxHeight?: string;              // 최대 높이
  onCopy?: (code: string) => void; // 복사 콜백
  className?: string;              // 추가 CSS 클래스
}

const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'html',
  showLineNumbers = true,
  theme = 'dark',
  maxHeight = '400px',
  onCopy,
  className = ''
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // 코드 포맷팅 (js-beautify 사용)
  const formattedCode = useMemo(() => {
    if (!code) return '';
    
    try {
      return beautifyHtml(code, {
        indent_size: 2,
        wrap_line_length: 80,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        end_with_newline: false
      });
    } catch (error) {
      console.warn('Code formatting failed, using original code:', error);
      return code;
    }
  }, [code]);

  // 테마 스타일 선택
  const themeConfig = getThemeConfig(theme);
  const themeStyle = themeConfig.style;

  // 클릭 시 복사 처리
  const handleClick = async () => {
    if (onCopy && code) {
      onCopy(code); // 원본 코드 복사 (포맷팅된 코드가 아닌)
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    }
  };

  // 키보드 이벤트 처리 (접근성)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onCopy && code && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick();
    }
  };

  if (!code) {
    return null;
  }

  return (
    <div 
      className={`relative ${className}`}
      role="region"
      aria-label={`${language} 코드 뷰어`}
    >
      <div
        role={onCopy ? "button" : "code"}
        tabIndex={onCopy ? 0 : -1}
        aria-label={onCopy ? "클릭하여 코드 복사" : undefined}
        aria-describedby={onCopy ? "copy-instruction" : undefined}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        style={{
          outline: 'none',
          borderRadius: '8px',
        }}
        onFocus={(e) => {
          if (onCopy) {
            e.target.style.outline = '2px solid #3b82f6';
            e.target.style.outlineOffset = '2px';
          }
        }}
        onBlur={(e) => {
          e.target.style.outline = 'none';
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={themeStyle}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          className="code-viewer-scrollbar touch-scroll code-viewer-mobile code-viewer-transition"
          customStyle={{
            maxHeight,
            fontSize: 'clamp(12px, 2.5vw, 14px)', // 반응형 폰트 크기
            borderRadius: '8px',
            cursor: onCopy ? 'pointer' : 'default',
            margin: 0,
            padding: 'clamp(12px, 3vw, 16px)', // 반응형 패딩
            overflowX: 'auto', // 가로 스크롤 보장
            overflowY: 'auto', // 세로 스크롤 보장
            WebkitOverflowScrolling: 'touch', // iOS 터치 스크롤 최적화
            scrollbarWidth: 'thin', // Firefox 스크롤바 스타일
            transition: 'background-color 0.2s ease, color 0.2s ease', // 테마 전환 애니메이션
          }}
          codeTagProps={{
            style: {
              fontSize: 'inherit',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
              lineHeight: '1.5',
              wordBreak: 'break-all', // 긴 단어 줄바꿈
              whiteSpace: 'pre-wrap', // 공백 및 줄바꿈 유지
            }
          }}
        >
          {formattedCode}
        </SyntaxHighlighter>
      </div>
      
      {/* 숨겨진 복사 안내 텍스트 (스크린 리더용) */}
      {onCopy && (
        <div id="copy-instruction" className="sr-only">
          Enter 키 또는 스페이스바를 눌러 코드를 복사할 수 있습니다.
        </div>
      )}
      
      {/* 복사 완료 피드백 */}
      {isCopied && (
        <div 
          className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-sm z-10 shadow-lg"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          복사됨!
        </div>
      )}
    </div>
  );
};

export default CodeViewer;