'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageOff, Upload, FileImage, Video } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Shadcn UI
import Toolbar from '@/components/Toolbar';
import Canvas from '@/components/Canvas';
import HtmlOutput from '@/components/HtmlOutput';
import LinkManager from '@/components/LinkManager';
import { generateHtmlTable } from '@/lib/htmlGenerator';
import { Cell, DragSelection, CellLink } from '@/components/types';
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
} from '@/components/ui/dialog';

type TableAlignment = 'left' | 'center' | 'right'; // Table 정렬 타입 정의

export default function ImageGridCutter() {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [imageFileName, setImageFileName] = useState<string>(''); // 원본 이미지 파일 이름 상태 추가
    const [cells, setCells] = useState<Cell[]>([]);
    const [deletedCells, setDeletedCells] = useState<Cell[]>([]);
    const [horizontalLines, setHorizontalLines] = useState<number[]>([]);
    const [verticalLines, setVerticalLines] = useState<number[]>([]);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [scale, setScale] = useState(1);
    const [isDraggingLine, setIsDraggingLine] = useState(false);
    const [dragLine, setDragLine] = useState<{
        type: 'horizontal' | 'vertical';
        index: number;
    } | null>(null);
    const [dragSelection, setDragSelection] = useState<DragSelection | null>(
        null
    );
    const [htmlCode, setHtmlCode] = useState<string>('');
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isVideoGuideOpen, setIsVideoGuideOpen] = useState<boolean>(false); // 가이드 영상 팝업 상태

    const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
    const [cachedDataUrls, setCachedDataUrls] = useState<Map<string, string>>(
        new Map()
    );

    const [cellLinks, setCellLinks] = useState<CellLink[]>([]); // 링크 정보 상태
    const [isDraggingOver, setIsDraggingOver] = useState(false); // 드래그 앤 드롭 상태
    const [hasCodeBeenGeneratedOnce, setHasCodeBeenGeneratedOnce] =
        useState(false); // 코드가 한 번이라도 생성되었는지 추적하는 상태

    // Table 정렬 값과 정렬 스타일이 적용되지 않은 기본 HTML 코드 상태 선언
    const [tableAlignment, setTableAlignment] =
        useState<TableAlignment>('left');
    const [baseHtmlCode, setBaseHtmlCode] = useState<string>('');
    const [basePreviewHtml, setBasePreviewHtml] = useState<string>('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // cells/deletedCells 변경 시 link 목록 정리
    useEffect(() => {
        if (image) {
            initializeGrid();
        }
    }, [image]);

    // 셀이 변경되거나 삭제되면 유효하지 않은 링크 제거
    useEffect(() => {
        const activeCellIds = new Set(
            cells
                .filter((cell) => !deletedCells.some((d) => d.id === cell.id))
                .map((c) => c.id)
        );

        setCellLinks((prevLinks) =>
            prevLinks.filter((link) => activeCellIds.has(link.cellId))
        );
    }, [cells, deletedCells]);

    // baseHtmlCode, basePreviewHtml, tableAlignment가 변경될 때마다 최종 HTML 코드를 업데이트합니다.
    useEffect(() => {
        const imageWidth = image?.width ?? 0;

        if (baseHtmlCode) {
            setHtmlCode(updateHtmlAlignment(baseHtmlCode, tableAlignment));
        } else {
            setHtmlCode('');
        }

        if (basePreviewHtml) {
            setPreviewHtml(
                updateHtmlAlignment(basePreviewHtml, tableAlignment)
            );
        } else {
            setPreviewHtml('');
        }
    }, [tableAlignment, baseHtmlCode, basePreviewHtml, image?.width]);

    // 정렬 상태에 따른 margin 스타일을 반환
    const getMarginStyle = (alignment: TableAlignment): string => {
        if (alignment === 'center') return 'margin: 0 auto;';
        if (alignment === 'right') return 'margin-left: auto;';
        return ''; // 'left'
    };

    // 본 HTML 코드에 정렬 스타일을 적용하여 최종 HTML 코드를 생성하는 함수 (비용이 적음)
    const updateHtmlAlignment = useCallback(
        (baseCode: string, alignment: TableAlignment): string => {
            if (!baseCode) return '';

            const marginStyle = getMarginStyle(alignment);

            // baseCode에서 <table> 태그를 찾습니다.
            const tableStartTagMatch = baseCode.match(/<table[^>]*>/i);
            if (!tableStartTagMatch) return baseCode;

            const originalTableTag = tableStartTagMatch[0];

            // 기존 style 속성 내용을 추출합니다.
            const styleMatch = originalTableTag.match(/style="([^"]*)"/i);
            let styleContent = styleMatch ? styleMatch[1].trim() : '';

            // 1. 기존에 적용된 모든 margin 스타일을 제거합니다.
            styleContent = styleContent
                .replace(/margin(-[a-z]+)?:[^;]+;?/g, '')
                .trim();

            // 2. 새로운 margin 스타일을 추가합니다.
            let newStyleContent = styleContent;
            if (marginStyle) {
                if (newStyleContent && !newStyleContent.endsWith(';')) {
                    newStyleContent += ';';
                }
                newStyleContent += marginStyle;
            }

            // 불필요한 세미콜론 정리
            newStyleContent = newStyleContent
                .replace(/;;/g, ';')
                .replace(/;$/g, '')
                .trim();

            // 3. style 속성을 업데이트한 새로운 <table> 태그를 생성합니다.
            let newTableTag = originalTableTag;
            if (styleMatch) {
                newTableTag = originalTableTag.replace(
                    styleMatch[0],
                    `style="${newStyleContent}"`
                );
            }

            // 4. 새로운 <table> 태그로 교체하여 최종 HTML 코드를 반환합니다.
            return baseCode.replace(originalTableTag, newTableTag);
        },
        []
    );

    // 이미지 로딩 및 그리드 초기화 로직 수정 (hasCodeBeenGeneratedOnce 초기화 추가)
    const loadImageAndInitializeGrid = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (!result || typeof result !== 'string') return;

            const img = new Image();
            img.onload = () => {
                setImage(img);
                setImageFileName(file.name); // 파일 이름 상태 설정
                setScale(1);
                setSelectedCells(new Set());
                setIsDraggingLine(false);
                setDragLine(null);
                setCells([]);
                setHorizontalLines([]);
                setVerticalLines([]);
                setDeletedCells([]);
                setHtmlCode('');
                setPreviewHtml('');
                setIsPreviewOpen(false);
                setIsVideoGuideOpen(false);
                setCachedDataUrls(new Map());
                setCellLinks([]);
                // 새로운 이미지 로드 시 상태 초기화
                setHasCodeBeenGeneratedOnce(false);
                // Talbe 정렬에 따른 상태 초기화
                setTableAlignment('left');
                setBaseHtmlCode('');
                setBasePreviewHtml('');
            };
            img.onerror = () => alert('이미지를 불러올 수 없습니다.');
            img.src = result;
        };
        reader.onerror = () => alert('파일을 읽을 수 없습니다.');
        reader.readAsDataURL(file);
    }, []);

    // 이미지 업로드 핸들러 수정: file input 또는 drag & drop 파일 처리
    const handleImageUpload = (
        e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>
    ) => {
        e.preventDefault(); // 기본 이벤트 (브라우저가 파일을 여는 동작) 방지
        setIsDraggingOver(false); // 드래그 오버 상태 초기화

        let file: File | undefined;

        if ('files' in e.target && e.target.files?.length) {
            // input[type="file"] 이벤트
            file = e.target.files[0];
        } else if ('dataTransfer' in e && e.dataTransfer.files?.length) {
            // Drag & Drop 이벤트
            file = e.dataTransfer.files[0];
        }

        if (file && file.type.startsWith('image/')) {
            loadImageAndInitializeGrid(file);
        } else if (file) {
            alert('이미지 파일만 업로드할 수 있습니다.');
        }

        // input[type="file"]의 value를 초기화하여 같은 파일 다시 선택 가능하도록
        if ('files' in e.target && e.target instanceof HTMLInputElement) {
            e.target.value = '';
        }
    };

    const initializeGrid = () => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = image.width;
        canvas.height = image.height;

        const rows = 3;
        const cols = 3;

        const hLines: number[] = [];
        const vLines: number[] = [];

        for (let i = 1; i < rows; i++) {
            // 1px 단위로 스냅 (정수로 반올림)
            hLines.push(Math.round((image.height / rows) * i));
        }
        for (let i = 1; i < cols; i++) {
            // 1px 단위로 스냅 (정수로 반올림)
            vLines.push(Math.round((image.width / cols) * i));
        }

        setHorizontalLines(hLines);
        setVerticalLines(vLines);

        const newCells: Cell[] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                newCells.push({
                    id: `${row}-${col}`,
                    row,
                    col,
                    rowSpan: 1,
                    colSpan: 1,
                });
            }
        }
        setCells(newCells);
        setDeletedCells([]);
        setHtmlCode('');
        setPreviewHtml('');
        setIsPreviewOpen(false);
        setCellLinks([]);
        // Table 정렬을 위한 상태 초기화
        setHasCodeBeenGeneratedOnce(false);
        setTableAlignment('left');
        setBaseHtmlCode('');
        setBasePreviewHtml('');
    };

    const changeImage = () => {
        if (
            window.confirm(
                '이미지를 변경하면 모든 작업 내용(그리드 라인, 셀 병합 등)이 초기화됩니다. 계속하시겠습니까?'
            )
        ) {
            fileInputRef.current?.click();
        }
    };

    // 그리드 변경 시 HTML 코드 초기화 (setHtmlCode('')만 호출, hasCodeBeenGeneratedOnce는 유지)
    const clearHtmlOutput = () => {
        setHtmlCode('');
        setPreviewHtml('');
    };

    // 새로운 기능: 그리드 변경 사항이 발생하면 HTML 출력을 지우도록 래핑된 Setter 함수들
    const setHorizontalLinesWrapper = (
        updater: React.SetStateAction<number[]>
    ) => {
        setHorizontalLines(updater);
        clearHtmlOutput();
    };
    const setVerticalLinesWrapper = (
        updater: React.SetStateAction<number[]>
    ) => {
        setVerticalLines(updater);
        clearHtmlOutput();
    };
    const setCellsWrapper = (updater: React.SetStateAction<Cell[]>) => {
        setCells(updater);
        clearHtmlOutput();
    };
    const setDeletedCellsWrapper = (updater: React.SetStateAction<Cell[]>) => {
        setDeletedCells(updater);
        clearHtmlOutput();
    };

    // LinkManager에서 사용할 헬퍼 함수
    const addOrUpdateLink = (cellId: string, url: string) => {
        setCellLinks((prevLinks) => {
            const existingIndex = prevLinks.findIndex(
                (link) => link.cellId === cellId
            );
            if (existingIndex > -1) {
                const newLinks = [...prevLinks];
                newLinks[existingIndex] = { cellId, linkUrl: url };
                return newLinks;
            } else {
                return [...prevLinks, { cellId, linkUrl: url }];
            }
        });
        clearHtmlOutput();
    };

    const removeLink = (cellId: string) => {
        setCellLinks((prevLinks) =>
            prevLinks.filter((link) => link.cellId !== cellId)
        );
        clearHtmlOutput();
    };

    // 드래그 오버 이벤트 핸들러
    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault(); // 드롭 허용
            e.stopPropagation();
            if (!isDraggingOver) {
                setIsDraggingOver(true);
            }
        },
        [isDraggingOver]
    );

    // 드래그 리브 이벤트 핸들러
    const handleDragLeave = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOver(false);
        },
        []
    );

    // 드롭 이벤트 핸들러 (handleImageUpload 재사용)
    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            handleImageUpload(e);
        },
        [handleImageUpload]
    );

    return (
        <div className='min-h-screen bg-gray-50 px-0 py-5 sm:px-5'>
            <div className='max-w-[1350px] mx-auto'>
                <div className='bg-white rounded-2xl shadow-md p-6 md:p-8'>
                    {/* 사이트 앱 타이틀  */}
                    <div className='flex items-center justify-between gap-3 mb-4'>
                        <div className='flex items-center gap-3'>
                            <ImageOff className='w-6 h-6 text-indido-600' />
                            <h1 className='text-xl md:text-2xl font-bold text-gray-800'>
                                Image eDM Code Generator
                            </h1>
                        </div>
                        {/* 가로선 삭제  */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-slate-500 hover:bg-slate-600 rounded-full w-8 h-8'
                                    onClick={() => setIsVideoGuideOpen(true)}
                                >
                                    <Video className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>사용 가이드 영상</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className='mb-2'>
                        <p className='text-sm'>
                            이미지는 그리드를 기준으로 분할되며 그리드 추가,
                            삭제, 이동 등 편집이 가능합니다. 셀을 드래그하여
                            선택한 후 병합하면 이미지 갯수를 최소화 할 수
                            있습니다.
                        </p>
                    </div>
                    {/* 파일 선택 인풋 필드  */}
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        onChange={handleImageUpload}
                        className='hidden'
                        id='file-input'
                    />

                    {!image ? (
                        // 드래그 앤 드롭 영역으로 수정
                        <div
                            className={`border-1 border-dashed rounded-xl p-12 text-center transition-colors 
                                ${
                                    isDraggingOver
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-300 hover:border-blue-400'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className='flex items-center justify-center mx-auto w-16 h-16 bg-gray-100 rounded-full mb-4'>
                                <Upload className='w-8 h-8 text-gray-400 mx-auto' />
                            </div>
                            <p className='text-lg text-gray-600 mb-2'>
                                이미지를 여기에 드래그하거나 버튼을 클릭하여
                                업로드하세요.
                            </p>
                            <Button
                                className='bg-indigo-500 hover:bg-indigo-600'
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileImage className='w-6 h-6 text-white' />
                                이미지 선택
                            </Button>
                            <p className='py-3 text-sm text-gray-400'>
                                JPG, PNG, GIF 파일을 지원합니다
                            </p>
                        </div>
                    ) : (
                        <div className='space-y-6'>
                            <Toolbar
                                horizontalLines={horizontalLines}
                                verticalLines={verticalLines}
                                selectedCells={selectedCells}
                                cells={cells}
                                deletedCells={deletedCells}
                                scale={scale}
                                image={image}
                                imageFileName={imageFileName} // imageFileName prop 전달
                                setHorizontalLines={setHorizontalLinesWrapper}
                                setVerticalLines={setVerticalLinesWrapper}
                                setCells={setCellsWrapper}
                                setSelectedCells={setSelectedCells}
                                setDeletedCells={setDeletedCellsWrapper}
                                setScale={setScale}
                                changeImage={changeImage}
                                initializeGrid={initializeGrid}
                                generateHtmlTable={() =>
                                    generateHtmlTable({
                                        image,
                                        cells,
                                        deletedCells,
                                        horizontalLines,
                                        verticalLines,
                                        cellLinks,
                                        setHtmlCode,
                                        imageFileName, // imageFileName prop 전달
                                        setPreviewHtml,
                                        setIsGenerating,
                                        setCachedDataUrls,
                                        canvasRef,
                                        setHasCodeBeenGeneratedOnce, // 새로운 setter 전달
                                        setBaseHtmlCode,
                                        setBasePreviewHtml,
                                    })
                                }
                                isGenerating={isGenerating}
                            />
                            <div className='flex flex-col lg:flex-row gap-6'>
                                <div className='lg:w-3/4'>
                                    <Canvas
                                        image={image}
                                        cells={cells}
                                        deletedCells={deletedCells}
                                        horizontalLines={horizontalLines}
                                        verticalLines={verticalLines}
                                        selectedCells={selectedCells}
                                        scale={scale}
                                        isDraggingLine={isDraggingLine}
                                        dragLine={dragLine}
                                        dragSelection={dragSelection}
                                        canvasRef={canvasRef}
                                        containerRef={containerRef}
                                        setHorizontalLines={
                                            setHorizontalLinesWrapper
                                        }
                                        setVerticalLines={
                                            setVerticalLinesWrapper
                                        }
                                        setSelectedCells={setSelectedCells}
                                        setIsDraggingLine={setIsDraggingLine}
                                        setDragLine={setDragLine}
                                        setDragSelection={setDragSelection}
                                        cellLinks={cellLinks}
                                    />
                                </div>
                                <div className='lg:w-1/4'>
                                    <LinkManager
                                        selectedCells={selectedCells}
                                        cells={cells}
                                        cellLinks={cellLinks}
                                        addOrUpdateLink={addOrUpdateLink}
                                        removeLink={removeLink}
                                        displayCols={getDisplayCols(
                                            cells.filter(
                                                (cell) =>
                                                    !deletedCells.some(
                                                        (d) => d.id === cell.id
                                                    )
                                            )
                                        )}
                                    />
                                </div>
                            </div>
                            <HtmlOutput
                                htmlCode={htmlCode}
                                previewHtml={previewHtml}
                                isPreviewOpen={isPreviewOpen}
                                setIsPreviewOpen={setIsPreviewOpen}
                                hasCodeBeenGeneratedOnce={
                                    hasCodeBeenGeneratedOnce // prop 전달
                                }
                                // Table 정렬을 위한 props 전달
                                tableAlignment={tableAlignment}
                                setTableAlignment={setTableAlignment}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 가이드 영상 팝업 Dialog */}
            <Dialog open={isVideoGuideOpen} onOpenChange={setIsVideoGuideOpen}>
                <DialogContent className='min-w-[100vh]'>
                    <DialogHeader>
                        <DialogTitle>가이드 영상</DialogTitle>
                    </DialogHeader>
                    <video
                        src='/video/guide.mp4'
                        autoPlay
                        controls
                        className='w-full rounded-lg'
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// 디스플레이 열을 가져오는 도우미 함수
function getDisplayCols(cells: Cell[]) {
    const displayCols = new Map<string, number>();
    const rows = new Set(cells.map((c) => c.row));
    for (const r of [...rows].sort((a, b) => a - b)) {
        const rowCells = cells
            .filter((c) => c.row === r)
            .sort((a, b) => a.col - b.col);
        let colIndex = 1;
        for (const cell of rowCells) {
            displayCols.set(cell.id, colIndex);
            colIndex++;
        }
    }
    return displayCols;
}
