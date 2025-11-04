'use client';

import React, { useEffect } from 'react';
import { Cell, DragSelection, CellLink } from '@/components/types';

interface CanvasProps {
    image: HTMLImageElement | null;
    cells: Cell[];
    deletedCells: Cell[];
    horizontalLines: number[];
    verticalLines: number[];
    selectedCells: Set<string>;
    scale: number;
    isDraggingLine: boolean;
    dragLine: { type: 'horizontal' | 'vertical'; index: number } | null;
    dragSelection: DragSelection | null;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    setHorizontalLines: React.Dispatch<React.SetStateAction<number[]>>;
    setVerticalLines: React.Dispatch<React.SetStateAction<number[]>>;
    setSelectedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
    setIsDraggingLine: React.Dispatch<React.SetStateAction<boolean>>;
    setDragLine: React.Dispatch<
        React.SetStateAction<{
            type: 'horizontal' | 'vertical';
            index: number;
        } | null>
    >;
    setDragSelection: React.Dispatch<
        React.SetStateAction<DragSelection | null>
    >;
    cellLinks: CellLink[]; // 링크 정보
}

export default function Canvas({
    image,
    cells,
    deletedCells,
    horizontalLines,
    verticalLines,
    selectedCells,
    scale,
    isDraggingLine,
    dragLine,
    dragSelection,
    canvasRef,
    containerRef,
    setHorizontalLines,
    setVerticalLines,
    setSelectedCells,
    setIsDraggingLine,
    setDragLine,
    setDragSelection,
    cellLinks,
}: CanvasProps) {
    useEffect(() => {
        drawCanvas();
    }, [
        image,
        cells,
        deletedCells,
        selectedCells,
        horizontalLines,
        verticalLines,
        scale,
        dragSelection,
        cellLinks,
    ]);

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !image) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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

        const linkedCellIds = new Set(cellLinks.map((link) => link.cellId));

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

        deletedCells.forEach((cell) => {
            const x = xPositions[cell.col];
            const y = yPositions[cell.row];
            const x2 = xPositions[cell.col + cell.colSpan];
            const y2 = yPositions[cell.row + cell.rowSpan];
            const w = x2 - x;
            const h = y2 - y;
            ctx.fillStyle = 'rgba(100, 100, 100, 0.15)';
            ctx.fillRect(x, y, w, h);
        });

        cells.forEach((cell) => {
            const x = xPositions[cell.col];
            const y = yPositions[cell.row];
            const x2 = xPositions[cell.col + cell.colSpan];
            const y2 = yPositions[cell.row + cell.rowSpan];
            const w = x2 - x;
            const h = y2 - y;

            const isSelected = selectedCells.has(cell.id);
            const isLinked = linkedCellIds.has(cell.id);

            // 셀 채우기 색상 로직: 선택된 셀이 가장 높은 우선순위 (붉은색)
            // 그 다음 링크된 셀 (녹색), 기본은 채우지 않음
            if (isSelected) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Red (selected)
                ctx.fillRect(x, y, w, h);
            } else if (isLinked) {
                ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'; // Green (linked: #22c55e)
                ctx.fillRect(x, y, w, h);
            }

            // 셀 테두리 색상 로직: 선택된 셀이 가장 높은 우선순위 (붉은색)
            // 그 다음 링크된 셀 (주황색), 기본은 파란색
            ctx.strokeStyle = isSelected
                ? '#ef4444' // 선택됨 (red-500)
                : isLinked
                ? '#f59e0b' // 링크 설정됨 (amber-500)
                : '#3b82f6'; // 기본 (blue-500)
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.strokeRect(x, y, w, h);

            const fontSize = Math.max(14, Math.min(w, h) * 0.08);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const displayCol = displayCols.get(cell.id) ?? cell.col + 1;
            const text = `${cell.row + 1}-${displayCol}`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = fontSize;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(
                x + w / 2 - textWidth / 2 - 8,
                y + h / 2 - textHeight / 2 - 4,
                textWidth + 16,
                textHeight + 8
            );
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x + w / 2, y + h / 2);

            // 링크 아이콘 표시 (우측 상단)
            if (isLinked) {
                const iconSize = Math.max(12, Math.min(w, h) * 0.1);
                const padding = 5;
                const linkIcon = '🔗'; // ******************************** 링크 아이콘 이모지
                ctx.font = `${iconSize}px sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#f59e0b'; // 링크 아이콘 색상은 주황색 유지
                ctx.fillText(linkIcon, x2 - padding, y + padding + 5);
            }
        });

        ctx.lineWidth = 3;
        const isInsideMergedCell = (
            lineX: number,
            lineY: number,
            isHorizontal: boolean
        ) => {
            for (const cell of cells) {
                if (cell.rowSpan > 1 || cell.colSpan > 1) {
                    const x1 = xPositions[cell.col];
                    const y1 = yPositions[cell.row];
                    const x2 = xPositions[cell.col + cell.colSpan];
                    const y2 = yPositions[cell.row + cell.rowSpan];
                    if (isHorizontal) {
                        if (
                            lineY > y1 &&
                            lineY < y2 &&
                            lineX >= x1 &&
                            lineX <= x2
                        )
                            return true;
                    } else {
                        if (
                            lineX > x1 &&
                            lineX < x2 &&
                            lineY >= y1 &&
                            lineY <= y2
                        )
                            return true;
                    }
                }
            }
            return false;
        };

        horizontalLines.forEach((y, index) => {
            ctx.strokeStyle =
                dragLine?.type === 'horizontal' && dragLine.index === index
                    ? '#10b981'
                    : '#3b82f6';
            let segments: { start: number; end: number }[] = [];
            let currentStart = 0;

            for (let x = 0; x <= canvas.width; x += 10) {
                const isInside = isInsideMergedCell(x, y, true);
                const nextIsInside = isInsideMergedCell(x + 10, y, true);
                if (!isInside && nextIsInside && currentStart < x) {
                    segments.push({ start: currentStart, end: x });
                    currentStart = -1;
                } else if (isInside && !nextIsInside) {
                    currentStart = x + 10;
                }
            }
            if (currentStart >= 0 && currentStart < canvas.width) {
                segments.push({ start: currentStart, end: canvas.width });
            }

            segments.forEach((seg) => {
                ctx.beginPath();
                ctx.moveTo(seg.start, y);
                ctx.lineTo(seg.end, y);
                ctx.stroke();
            });

            ctx.fillStyle =
                dragLine?.type === 'horizontal' && dragLine.index === index
                    ? '#10b981'
                    : '#3b82f6';
            ctx.fillRect(canvas.width - 30, y - 5, 25, 10);
        });

        verticalLines.forEach((x, index) => {
            ctx.strokeStyle =
                dragLine?.type === 'vertical' && dragLine.index === index
                    ? '#10b981'
                    : '#3b82f6';
            let segments: { start: number; end: number }[] = [];
            let currentStart = 0;

            for (let y = 0; y <= canvas.height; y += 10) {
                const isInside = isInsideMergedCell(x, y, false);
                const nextIsInside = isInsideMergedCell(x, y + 10, false);
                if (!isInside && nextIsInside && currentStart < y) {
                    segments.push({ start: currentStart, end: y });
                    currentStart = -1;
                } else if (isInside && !nextIsInside) {
                    currentStart = y + 10;
                }
            }
            if (currentStart >= 0 && currentStart < canvas.height) {
                segments.push({ start: currentStart, end: canvas.height });
            }

            segments.forEach((seg) => {
                ctx.beginPath();
                ctx.moveTo(x, seg.start);
                ctx.lineTo(x, seg.end);
                ctx.stroke();
            });

            ctx.fillStyle =
                dragLine?.type === 'vertical' && dragLine.index === index
                    ? '#10b981'
                    : '#3b82f6';
            ctx.fillRect(x - 5, canvas.height - 30, 10, 25);
        });

        if (dragSelection) {
            const { startX, startY, currentX, currentY } = dragSelection;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const w = Math.abs(startX - currentX);
            const h = Math.abs(startY - currentY);
            ctx.fillStyle = 'rgba(66, 153, 225, 0.3)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#4299e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        }
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLElement>) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        const clientX = e.clientX;
        const clientY = e.clientY;
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        const scaleFactorX = canvasWidth / displayWidth;
        const scaleFactorY = canvasHeight / displayHeight;

        return {
            x: offsetX * scaleFactorX,
            y: offsetY * scaleFactorY,
        };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLElement>) => {
        const { x, y } = getCanvasCoordinates(e);
        const threshold = 10;

        for (let i = 0; i < horizontalLines.length; i++) {
            if (Math.abs(y - horizontalLines[i]) < threshold) {
                setIsDraggingLine(true);
                setDragLine({ type: 'horizontal', index: i });
                return;
            }
        }

        for (let i = 0; i < verticalLines.length; i++) {
            if (Math.abs(x - verticalLines[i]) < threshold) {
                setIsDraggingLine(true);
                setDragLine({ type: 'vertical', index: i });
                return;
            }
        }

        setDragSelection({ startX: x, startY: y, currentX: x, currentY: y });
        if (!e.ctrlKey && !e.metaKey) {
            setSelectedCells(new Set());
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e);
        const threshold = 10;
        let cursorStyle = 'crosshair';

        if (dragSelection) {
            cursorStyle = 'crosshair';
        } else {
            let isNearHorizontal = false;
            let isNearVertical = false;

            for (let hLine of horizontalLines) {
                if (Math.abs(y - hLine) < threshold) {
                    isNearHorizontal = true;
                    break;
                }
            }
            for (let vLine of verticalLines) {
                if (Math.abs(x - vLine) < threshold) {
                    isNearVertical = true;
                    break;
                }
            }

            if (isNearHorizontal && !isNearVertical) {
                cursorStyle = 'ns-resize';
            } else if (isNearVertical && !isNearHorizontal) {
                cursorStyle = 'ew-resize';
            } else if (!isNearHorizontal && !isNearVertical) {
                cursorStyle = 'default';
            }
        }
        canvas.style.cursor = cursorStyle;

        if (isDraggingLine && dragLine) {
            if (dragLine.type === 'horizontal') {
                // 1px 단위로 스냅 (정수로 반올림)
                const newY = Math.round(
                    Math.max(10, Math.min(canvas.height - 10, y))
                );
                const newLines = [...horizontalLines];
                newLines[dragLine.index] = newY;
                setHorizontalLines(newLines);
            } else {
                // 1px 단위로 스냅 (정수로 반올림)
                const newX = Math.round(
                    Math.max(10, Math.min(canvas.width - 10, x))
                );
                const newLines = [...verticalLines];
                newLines[dragLine.index] = newX;
                setVerticalLines(newLines);
            }
            return;
        }

        if (dragSelection) {
            setDragSelection((prev) =>
                prev ? { ...prev, currentX: x, currentY: y } : null
            );

            const rect = {
                x1: Math.min(dragSelection.startX, x),
                y1: Math.min(dragSelection.startY, y),
                x2: Math.max(dragSelection.startX, x),
                y2: Math.max(dragSelection.startY, y),
            };

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
            const newlySelected = new Set<string>();

            cells.forEach((cell) => {
                const cx1 = xPositions[cell.col];
                const cy1 = yPositions[cell.row];
                const cx2 = xPositions[cell.col + cell.colSpan];
                const cy2 = yPositions[cell.row + cell.rowSpan];
                if (
                    cx1 < rect.x2 &&
                    cx2 > rect.x1 &&
                    cy1 < rect.y2 &&
                    cy2 > rect.y1
                ) {
                    newlySelected.add(cell.id);
                }
            });

            if (!e.ctrlKey && !e.metaKey) {
                setSelectedCells(newlySelected);
            }
        }
    };

    const handleCanvasMouseUp = (e: React.MouseEvent<HTMLElement>) => {
        if (isDraggingLine) {
            setIsDraggingLine(false);
            setDragLine(null);
            return;
        }

        if (dragSelection) {
            const { x, y } = getCanvasCoordinates(e);
            const rect = {
                x1: Math.min(dragSelection.startX, x),
                y1: Math.min(dragSelection.startY, y),
                x2: Math.max(dragSelection.startX, x),
                y2: Math.max(dragSelection.startY, y),
            };

            const canvas = canvasRef.current;
            if (!canvas) return;
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
            const newlySelected = new Set<string>();

            cells.forEach((cell) => {
                const cx1 = xPositions[cell.col];
                const cy1 = yPositions[cell.row];
                const cx2 = xPositions[cell.col + cell.colSpan];
                const cy2 = yPositions[cell.row + cell.rowSpan];
                if (
                    cx1 < rect.x2 &&
                    cx2 > rect.x1 &&
                    cy1 < rect.y2 &&
                    cy2 > rect.y1
                ) {
                    newlySelected.add(cell.id);
                }
            });

            if (e.ctrlKey || e.metaKey) {
                setSelectedCells((prev) => {
                    const newSet = new Set(prev);
                    newlySelected.forEach((id) => {
                        if (prev.has(id)) newSet.delete(id);
                        else newSet.add(id);
                    });
                    return newSet;
                });
            } else if (newlySelected.size > 0) {
                setSelectedCells(newlySelected);
            } else if (
                Math.abs(dragSelection.startX - x) < 5 &&
                Math.abs(dragSelection.startY - y) < 5
            ) {
                handleSingleClickSelection(x, y, e);
            }

            setDragSelection(null);
        }
    };

    const handleSingleClickSelection = (
        x: number,
        y: number,
        e: React.MouseEvent<HTMLElement>
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
        let clickedRow = -1;
        let clickedCol = -1;

        for (let i = 0; i < yPositions.length - 1; i++) {
            if (y >= yPositions[i] && y < yPositions[i + 1]) {
                clickedRow = i;
                break;
            }
        }
        for (let i = 0; i < xPositions.length - 1; i++) {
            if (x >= xPositions[i] && x < xPositions[i + 1]) {
                clickedCol = i;
                break;
            }
        }

        if (clickedRow >= 0 && clickedCol >= 0) {
            const clickedCell = cells.find(
                (cell) =>
                    clickedRow >= cell.row &&
                    clickedRow < cell.row + cell.rowSpan &&
                    clickedCol >= cell.col &&
                    clickedCol < cell.col + cell.colSpan
            );

            if (clickedCell) {
                const newSelected = new Set(selectedCells);
                if (e.ctrlKey || e.metaKey) {
                    if (newSelected.has(clickedCell.id)) {
                        newSelected.delete(clickedCell.id);
                    } else {
                        newSelected.add(clickedCell.id);
                    }
                } else {
                    if (
                        selectedCells.size === 1 &&
                        selectedCells.has(clickedCell.id)
                    ) {
                        newSelected.clear();
                    } else {
                        newSelected.clear();
                        newSelected.add(clickedCell.id);
                    }
                }
                setSelectedCells(newSelected);
            }
        }
    };

    return (
        <div
            ref={containerRef}
            // className='overflow-auto max-h-[80vh] border border-gray-200 rounded-lg'
            className='overflow-auto h-[80vh] max-h-[1000px] border border-gray-200 rounded-lg'
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onMouseMove={handleCanvasMouseMove}
        >
            <canvas
                ref={canvasRef}
                className='block mx-auto'
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                }}
                onMouseDown={handleCanvasMouseDown}
            />
        </div>
    );
}
