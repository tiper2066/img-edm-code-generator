import React, { useState, useCallback, useMemo } from 'react';
import {
    Eye,
    Copy,
    Check,
    AlertTriangle,
    FileJson,
    ChevronDown,
    FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button'; // Shadcn UI
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CodeViewer from '@/components/CodeViewer';
import ThemeSelector from '@/components/ThemeSelector';
import { useTheme } from '@/lib/useTheme';

// TableAlignment 타입을 정의 (ImageGridCutter.tsx와 동일)
type TableAlignment = 'left' | 'center' | 'right';

interface HtmlOutputProps {
    htmlCode: string;
    previewHtml: string;
    isPreviewOpen: boolean;
    setIsPreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
    hasCodeBeenGeneratedOnce: boolean;
    // Table 정렬을 위한 props 추가
    tableAlignment: TableAlignment;
    setTableAlignment: React.Dispatch<React.SetStateAction<TableAlignment>>;
}

export default function HtmlOutput({
    htmlCode,
    previewHtml,
    isPreviewOpen,
    setIsPreviewOpen,
    hasCodeBeenGeneratedOnce,
    // Table 정렬을 위한 props
    tableAlignment,
    setTableAlignment,
}: HtmlOutputProps) {
    const [isCopied, setIsCopied] = useState(false); // 복사 상태 관리를 위한 state
    const { theme, setTheme } = useTheme(); // 테마 관리 훅

    /* 클립보드에 HTML 코드를 복사하는 함수: @param code 복사할 HTML 코드 */
    const copyToClipboard = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1000); // 1초 후 상태 초기화
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            alert(
                '클립보드 복사에 실패했습니다. 브라우저 설정을 확인해주세요.'
            );
        }
    };

    // 복사 방법 1: 코드 영역 클릭 시 복사
    const handleCodeClick = () => {
        if (htmlCode) {
            copyToClipboard(htmlCode);
        }
    };

    // 복사 방법 2: '코드 복사' 버튼 클릭 시 복사
    const handleButtonClick = () => {
        copyToClipboard(htmlCode);
    };

    // 테이블 정렬 변경 핸들러 (성능 최적화)
    const handleTableAlignmentChange = useCallback((value: string) => {
        // 타입 검증을 미리 수행하여 불필요한 렌더링 방지
        if (value === 'left' || value === 'center' || value === 'right') {
            setTableAlignment(value);
        }
    }, [setTableAlignment]);

    // 테이블 정렬 표시 텍스트 메모이제이션
    const alignmentDisplayText = useMemo(() => {
        switch (tableAlignment) {
            case 'left': return '좌측(기본)';
            case 'center': return '중앙';
            case 'right': return '우측';
            default: return '좌측(기본)';
        }
    }, [tableAlignment]);

    // @type {boolean} 코드가 비어있고 (htmlCode === '') && 이전에 코드가 한 번이라도 생성된 적이 있다면 (hasCodeBeenGeneratedOnce === true)
    // -> 그리드 편집 후 코드가 지워진 상태 = Dirty 상태
    const isCodeDirty = htmlCode === '' && hasCodeBeenGeneratedOnce;

    // @type {boolean} 코드가 비어있고 (htmlCode === '') && 이전에 코드가 생성된 적이 없다면 (hasCodeBeenGeneratedOnce === false)
    // -> 이미지 로드 직후 상태 = Initial 상태
    const isInitialState = htmlCode === '' && !hasCodeBeenGeneratedOnce;

    return (
        <>
            <div>
                <div className='flex justify-between items-end mb-4'>
                    <h2 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
                        <FileCode className='w-6 h-6 text-gray-800' />
                        자동 생성 HTML 코드
                    </h2>
                    {/* 복사 및 미리보기 버튼 영역 */}
                    <div className='flex items-center gap-2 flex-wrap'>
                        {/* 테마 선택기 - 코드가 한 번 생성되었고 코드가 더티 상태가 아닐 때만 표시 */}
                        {hasCodeBeenGeneratedOnce && !isCodeDirty && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <ThemeSelector
                                            theme={theme}
                                            onThemeChange={setTheme}
                                            // size="sm"
                                            variant="outline"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>코드 테마 선택</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {/* 테이블 정렬 드롭다운 메뉴 - 코드가 한 번 생성되었고 (hasCodeBeenGeneratedOnce) 코드가 더티 상태가 아닐 때(!isCodeDirty)만 표시  */}
                        {hasCodeBeenGeneratedOnce && !isCodeDirty && (
                            <DropdownMenu>
                                <Tooltip>
                                    <DropdownMenuTrigger asChild>
                                        <TooltipTrigger asChild>
                                            <Button variant='outline'>
                                                <span className='text-gray-500'>
                                                    정렬:
                                                </span>{' '}
                                                {alignmentDisplayText}
                                                <ChevronDown className='h-4 w-4 text-gray-500 hover:text-gray-900' />
                                            </Button>
                                        </TooltipTrigger>
                                    </DropdownMenuTrigger>
                                    <TooltipContent>
                                        <p>테이블 정렬</p>
                                    </TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align='start'>
                                    <DropdownMenuRadioGroup
                                        value={tableAlignment}
                                        onValueChange={handleTableAlignmentChange}
                                    >
                                        <DropdownMenuRadioItem value='left'>
                                            좌측(기본)
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='center'>
                                            중앙
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value='right'>
                                            우측
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {/* 코드 복사 버튼 - htmlCode가 없으면 비활성화 */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleButtonClick}
                                    disabled={htmlCode === ''}
                                    className={`${
                                        isCopied
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-indigo-500 text-white hover:bg-indigo-600'
                                    }`}
                                >
                                    {isCopied ? (
                                        <Check className='w-5 h-5' />
                                    ) : (
                                        <Copy className='w-5 h-5' />
                                    )}
                                    {isCopied ? '복사 완료!' : '코드 복사'}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>코드 복사</p>
                            </TooltipContent>
                        </Tooltip>
                        {/* 미리보기 버튼 - htmlCode가 없으면 비활성화 */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => setIsPreviewOpen(true)}
                                    disabled={htmlCode === ''}
                                    className='bg-gray-700 text-white hover:bg-gray-900'
                                >
                                    <Eye className='w-5 h-5' />
                                    미리보기
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>적용된 링크를 테스트해보세요.</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {isCodeDirty ? ( // 1. Dirty State: 그리드 편집 후 경고 메시지 표시
                    <div className='bg-yellow-50 border border-yellow-300 p-8 rounded-lg text-center'>
                        <AlertTriangle className='w-12 h-12 text-yellow-600 mx-auto mb-3' />
                        <p className='text-xl font-bold text-yellow-800 mb-2'>
                            그리드 편집 내용이 변경되었습니다.
                        </p>
                        <p className='text-gray-600'>
                            새로운 HTML 코드를 생성하려면 상단의 "코드 생성"
                            버튼을 다시 클릭해주세요.
                        </p>
                    </div>
                ) : isInitialState ? ( // 2. Initial State: 이미지 업로드 직후 안내 메시지 표시 (수정된 부분)
                    <div className='bg-gray-100 border border-gray-300 p-8 rounded-lg text-center'>
                        <FileJson
                            className='w-12 h-12 text-purple-400 mx-auto mb-3'
                            strokeWidth={1.5} // 아이콘 라인 두께
                        />
                        <p className='text-xl font-bold text-gray-700 mb-2'>
                            HTML 코드를 생성할 준비가 되었습니다.
                        </p>
                        <p className='text-gray-500'>
                            그리드 편집을 완료하고 상단의 "코드 생성" 버튼을
                            클릭하여 코드를 확인하세요.
                        </p>
                    </div>
                ) : (
                    // 3. Generated State: 코드가 존재하는 경우 코드 표시 ---->  CodeViewer 컴포넌트 사용
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className='hover:border-sky-500 border-2 border-transparent transition-colors rounded-xl'>
                                <CodeViewer
                                    code={htmlCode}
                                    theme={theme}
                                    maxHeight="min(400px, 50vh)" // 반응형 최대 높이
                                    onCopy={copyToClipboard}
                                    className="rounded-lg overflow-hidden w-full"
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>클릭하면 HTML 코드를 복사합니다.</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* 미리보기 팝업 Dialog: 코드가 존재하는 경우에만 렌더링됨 */}
            {!isCodeDirty && !isInitialState && previewHtml && (
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className='min-w-[80%]'>
                        <DialogHeader>
                            <DialogTitle>HTML 테이블 미리보기</DialogTitle>
                            <DialogDescription>
                                테이블로 분리된 이미지와 적용된 링크를 미리
                                확인할 수 있습니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className='border border-gray-300 p-2 rounded-lg bg-white overflow-x-auto max-h-[70vh]'>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: previewHtml,
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
