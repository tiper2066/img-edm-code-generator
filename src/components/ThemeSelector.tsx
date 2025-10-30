import React from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeType, themes, getThemeConfig } from '@/lib/themeManager';

interface ThemeSelectorProps {
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  theme,
  onThemeChange,
  disabled = false,
  size = 'default',
  variant = 'outline',
  className = ''
}) => {
  const currentThemeConfig = getThemeConfig(theme);

  // 테마별 아이콘 가져오기
  const getThemeIcon = (themeName: ThemeType) => {
    switch (themeName) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Palette className="w-4 h-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={className}
          aria-label={`현재 테마: ${currentThemeConfig.displayName}. 클릭하여 테마 변경`}
          aria-expanded={false}
          aria-haspopup="menu"
        >
          {getThemeIcon(theme)}
          <span className="hidden sm:inline">
            {currentThemeConfig.displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40" role="menu" aria-label="테마 선택 메뉴">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (value === 'light' || value === 'dark') {
              onThemeChange(value);
            }
          }}
        >
          {themes.map((themeConfig) => (
            <DropdownMenuRadioItem
              key={themeConfig.name}
              value={themeConfig.name}
              className="flex items-center gap-2 cursor-pointer"
              role="menuitemradio"
              aria-checked={theme === themeConfig.name}
            >
              {getThemeIcon(themeConfig.name)}
              <span>{themeConfig.displayName} 테마</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;