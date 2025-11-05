'use client';

import JSZip from 'jszip';
import React from 'react';
import {
    Plus,
    Minus,
    TableCellsMerge,
    Trash2,
    RotateCcw,
    ZoomIn,
    ZoomOut,
    ImageUp,
    ListRestart,
    Search,
    CodeXml,
    ArrowDownToLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Cell } from '@/components/types';

interface ToolbarProps {
    horizontalLines: number[];
    verticalLines: number[];
    selectedCells: Set<string>;
    cells: Cell[];
    deletedCells: Cell[];
    scale: number;
    image: HTMLImageElement | null;
    imageFileName: string; // 원본 이미지 파일 이름
    setHorizontalLines: React.Dispatch<React.SetStateAction<number[]>>;
    setVerticalLines: React.Dispatch<React.SetStateAction<number[]>>;
    setCells: React.Dispatch<React.SetStateAction<Cell[]>>;
    setSelectedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
    setDeletedCells: React.Dispatch<React.SetStateAction<Cell[]>>;
    setScale: React.Dispatch<React.SetStateAction<number>>;
    changeImage: () => void;
    initializeGrid: () => void;
    generateHtmlTable: () => void;
    isGenerating: boolean;
    // isPreviewOpen: boolean;
    // setIsPreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Toolbar({
    horizontalLines,
    verticalLines,
    selectedCells,
    cells,
    deletedCells,
    scale,
    image,
    imageFileName,
    setHorizontalLines,
    setVerticalLines,
    setCells,
    setSelectedCells,
    setDeletedCells,
    setScale,
    changeImage,
    initializeGrid,
    generateHtmlTable,
    // isPreviewOpen,
    // setIsPreviewOpen,
    isGenerating,
}: ToolbarProps) {
    const addHorizontalLine = () => {
        if (!image) return;

        const canvasHeight = image.height;
        const rows = horizontalLines.length + 1; // 현재 행 수
        const newRows = rows + 1; // 새로운 행 수

        // 새로운 그리드 라인 위치 계산 (모든 행이 동일한 높이를 갖도록)
        const newLines = [];
        for (let i = 1; i < newRows; i++) {
            // 1px 단위로 스냅 (정수로 반올림)
            newLines.push(Math.round((canvasHeight / newRows) * i));
        }

        setHorizontalLines(newLines);
        updateCellsFromGridLines(newLines, verticalLines);
    };

    const removeLastHorizontalLine = () => {
        if (horizontalLines.length > 0) {
            const newLines = horizontalLines.slice(0, -1);
            setHorizontalLines(newLines);
            updateCellsFromGridLines(newLines, verticalLines);
        }
    };

    const addVerticalLine = () => {
        if (!image) return;

        const canvasWidth = image.width;
        const cols = verticalLines.length + 1; // 현재 열 수
        const newCols = cols + 1; // 새로운 열 수

        // 새로운 그리드 라인 위치 계산 (모든 열이 동일한 너비를 갖도록)
        const newLines = [];
        for (let i = 1; i < newCols; i++) {
            // 1px 단위로 스냅 (정수로 반올림)
            newLines.push(Math.round((canvasWidth / newCols) * i));
        }

        setVerticalLines(newLines);
        updateCellsFromGridLines(horizontalLines, newLines);
    };

    const removeLastVerticalLine = () => {
        if (verticalLines.length > 0) {
            const newLines = verticalLines.slice(0, -1);
            setVerticalLines(newLines);
            updateCellsFromGridLines(horizontalLines, newLines);
        }
    };

    const updateCellsFromGridLines = (hLines: number[], vLines: number[]) => {
        const rows = hLines.length + 1;
        const cols = vLines.length + 1;
        const mergedCells = cells.filter(
            (cell) => cell.rowSpan > 1 || cell.colSpan > 1
        );
        const newCells: Cell[] = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isMerged = mergedCells.some(
                    (merged) =>
                        row >= merged.row &&
                        row < merged.row + merged.rowSpan &&
                        col >= merged.col &&
                        col < merged.col + merged.colSpan
                );
                if (!isMerged) {
                    newCells.push({
                        id: `${row}-${col}`,
                        row,
                        col,
                        rowSpan: 1,
                        colSpan: 1,
                    });
                }
            }
        }
        setCells([...mergedCells, ...newCells]);
    };

    const validateCellsForMerge = (selectedCellsArray: Cell[]): boolean => {
        if (selectedCellsArray.length < 2) return false;
        let minRow = Infinity;
        let maxRow = -Infinity;
        let minCol = Infinity;
        let maxCol = -Infinity;
        const covered = new Set<string>();

        for (const cell of selectedCellsArray) {
            for (let r = cell.row; r < cell.row + cell.rowSpan; r++) {
                for (let c = cell.col; c < cell.col + cell.colSpan; c++) {
                    const key = `${r}-${c}`;
                    if (covered.has(key)) return false;
                    covered.add(key);
                    minRow = Math.min(minRow, r);
                    maxRow = Math.max(maxRow, r);
                    minCol = Math.min(minCol, c);
                    maxCol = Math.max(maxCol, c);
                }
            }
        }
        const expected = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        return covered.size === expected;
    };

    const mergeCells = () => {
        const selectedCellsArray = cells.filter((cell) =>
            selectedCells.has(cell.id)
        );
        if (selectedCellsArray.length < 2) {
            alert('병합하려면 2개 이상의 셀을 선택해야 합니다.');
            return;
        }
        if (!validateCellsForMerge(selectedCellsArray)) {
            alert(
                '셀 병합 실패: 선택된 셀들은 반드시 **인접한 직사각형 영역**을 형성해야 하며, **중간에 건너뛰거나 대각선으로 떨어진 셀을 포함할 수 없습니다**.'
            );
            return;
        }

        const minRow = Math.min(...selectedCellsArray.map((c) => c.row));
        const maxRow = Math.max(
            ...selectedCellsArray.map((c) => c.row + c.rowSpan - 1)
        );
        const minCol = Math.min(...selectedCellsArray.map((c) => c.col));
        const maxCol = Math.max(
            ...selectedCellsArray.map((c) => c.col + c.colSpan - 1)
        );

        const mergedCell: Cell = {
            id: `${minRow}-${minCol}-merged-${Date.now()}`,
            row: minRow,
            col: minCol,
            rowSpan: maxRow - minRow + 1,
            colSpan: maxCol - minCol + 1,
        };

        const newCells = cells.filter((cell) => !selectedCells.has(cell.id));
        newCells.push(mergedCell);
        setCells(newCells);
        setSelectedCells(new Set([mergedCell.id]));
    };

    const deleteCell = () => {
        if (selectedCells.size === 0) {
            alert('삭제할 셀을 선택하세요.');
            return;
        }
        const deleted = cells.filter((cell) => selectedCells.has(cell.id));
        setDeletedCells([...deletedCells, ...deleted]);
        const newCells = cells.filter((cell) => !selectedCells.has(cell.id));
        setCells(newCells);
        setSelectedCells(new Set());
    };

    const cropAndDownloadImages = async () => {
        if (!image) return;
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const yPositions = [
            0,
            ...horizontalLines.sort((a, b) => a - b),
            canvas.height,
        ];
        const xPositions = [
            0,
            ...verticalLines.sort((a, b) => a - b),
            canvas.width,
        ];
        const activeCells = cells.filter(
            (cell) => !deletedCells.some((d) => d.id === cell.id)
        );

        const displayCols = new Map<string, number>();
        const rows = new Set(activeCells.map((c) => c.row));
        for (const r of [...rows].sort((a, b) => a - b)) {
            const rowCells = activeCells
                .filter((c) => c.row === r)
                .sort((a, b) => a.col - b.col);
            let colIndex = 1;
            for (const cell of rowCells) {
                displayCols.set(cell.id, colIndex);
                colIndex++;
            }
        }

        const zip = new JSZip();
        const imagePromises: Promise<void>[] = [];

        for (const cell of activeCells) {
            const promise = new Promise<void>((resolve) => {
                const x = xPositions[cell.col];
                const y = yPositions[cell.row];
                const x2 = xPositions[cell.col + cell.colSpan];
                const y2 = yPositions[cell.row + cell.rowSpan];
                const w = x2 - x;
                const h = y2 - y;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                if (!tempCtx) return resolve();

                tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

                const displayCol = displayCols.get(cell.id) ?? cell.col + 1;
                const filename = `cell_${
                    cell.row + 1
                }-${displayCol}_${w}x${h}.png`;

                tempCanvas.toBlob((blob) => {
                    if (blob) {
                        zip.file(filename, blob);
                    }
                    resolve();
                }, 'image/png');
            });
            imagePromises.push(promise);
        }

        await Promise.all(imagePromises);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;

        // 원본 파일명에서 확장자를 제거하고 .zip을 붙여 다운로드 파일명으로 사용
        const zipFileName = imageFileName.includes('.')
            ? imageFileName.substring(0, imageFileName.lastIndexOf('.')) +
              '.zip'
            : imageFileName + '.zip';
        a.download = zipFileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const zoomIn = () => setScale(Math.min(scale + 0.1, 2));
    const zoomOut = () => setScale(Math.max(scale - 0.1, 0.3));
    const zoomActualSize = () => setScale(1);

    return (
        <div className='bg-indigo-50 p-6 rounded-lg'>
            {/* <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'> */}
            <div className='flex items-center justify-start flex-wrap gap-8'>
                {/* 그리드 상태 보기  */}
                <div className='space-y-3 truncate ㅣ:w-[25%]'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className='flex gap-2 px-3 py-1.5 bg-white rounded'>
                                <p>
                                    <span className='font-semibold'>
                                        {horizontalLines.length + 1}
                                    </span>
                                    x
                                    <span className='font-semibold'>
                                        {verticalLines.length + 1}
                                    </span>{' '}
                                    |{' '}
                                    <span className='font-semibold'>
                                        {cells.length}
                                    </span>{' '}
                                    cell
                                </p>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>그리드 상태</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                {/* 그리드 및 셀 편집  */}
                <div className='space-y-3'>
                    <div className='flex items-center gap-2 flex-wrap'>
                        <span className='w-full sm:w-auto'>
                            그리드 및 셀 편집:{' '}
                        </span>
                        {/* 가로선 추가  */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-600 hover:bg-gray-700'
                                    onClick={addHorizontalLine}
                                >
                                    <Plus className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>가로선 추가</p>
                            </TooltipContent>
                        </Tooltip>
                        {/* 가로선 삭제  */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-500 hover:bg-gray-600'
                                    onClick={removeLastHorizontalLine}
                                >
                                    <Minus className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>가로선 삭제</p>
                            </TooltipContent>
                        </Tooltip>
                        ,{/* 세로선 추가  */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-600 hover:bg-gray-700'
                                    onClick={addVerticalLine}
                                >
                                    <Plus className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>세로선 추가</p>
                            </TooltipContent>
                        </Tooltip>
                        {/* 세로선 삭제 */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-500 hover:bg-gray-600'
                                    onClick={removeLastVerticalLine}
                                >
                                    <Minus className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>세로선 삭제</p>
                            </TooltipContent>
                        </Tooltip>
                        {/* 셀 병합  */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-500 hover:bg-gray-600 ml-3'
                                    onClick={initializeGrid}
                                >
                                    <RotateCcw className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>그리드 초기화</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-purple-600  hover:bg-purple-700 transition-colors  disabled:bg-gray-400 disabled:cursor-not-allowed'
                                    onClick={mergeCells}
                                    disabled={selectedCells.size < 2}
                                >
                                    <TableCellsMerge className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{`셀 병합 (${selectedCells.size})`}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                {/* 보기 설정  */}
                <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                        보기:
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className='text-center text-sm text-gray-600 bg-white px-[6px] py-[4px] rounded-xs'>{`${Math.round(
                                    scale * 100
                                )}%`}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>현재 크기</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-500 hover:bg-gray-600'
                                    onClick={zoomOut}
                                >
                                    <ZoomOut className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>축소</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-500 hover:bg-gray-600'
                                    onClick={zoomActualSize}
                                >
                                    <Search className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>100%</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-500 hover:bg-gray-600'
                                    onClick={zoomIn}
                                >
                                    <ZoomIn className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>확대</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                {/* 액션 버튼  */}
                <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                        액션:
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-indigo-500 hover:bg-indigo-600'
                                    onClick={changeImage}
                                >
                                    <ImageUp className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>이미지 변경</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size='icon'
                                    className='bg-gray-700 hover:bg-gray-900'
                                    onClick={cropAndDownloadImages}
                                >
                                    <ArrowDownToLine className='h-4 w-4 text-white' />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>이미지 다운로드</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    className='bg-purple-500 hover:bg-purple-600 disabled:opacity-50'
                                    onClick={generateHtmlTable}
                                    disabled={!image || isGenerating}
                                >
                                    <CodeXml className='h-4 w-4 text-white' />
                                    {isGenerating ? '생성 중...' : 'Code 생성'}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    그리드 기반으로 이미지를 잘라 HTML Table
                                    코드 생성
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                {/* 그리드 및 셀 편집  */}
                {/* <div className='flex items-center lg:w-[25%] justify-start flex-wrap gap-8'>
             
                </div> */}
            </div>
        </div>
    );
}
