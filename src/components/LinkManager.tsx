import React, { useState, useEffect } from 'react';
import { Link, Trash2, Plus, Pencil, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Cell, CellLink } from '@/components/types';

interface LinkManagerProps {
    selectedCells: Set<string>;
    cells: Cell[];
    cellLinks: CellLink[];
    addOrUpdateLink: (cellId: string, url: string) => void;
    removeLink: (cellId: string) => void;
    displayCols: Map<string, number>;
}

export default function LinkManager({
    selectedCells,
    cells,
    cellLinks,
    addOrUpdateLink,
    removeLink,
    displayCols,
}: LinkManagerProps) {
    const [linkInput, setLinkInput] = useState<string>('');
    const [currentCellId, setCurrentCellId] = useState<string | null>(null);

    // 선택된 셀이 변경되면 입력 필드 업데이트
    useEffect(() => {
        if (selectedCells.size === 1) {
            const selectedId = selectedCells.keys().next().value;
            setCurrentCellId(selectedId || null);
            const existingLink = cellLinks.find(
                (link) => link.cellId === selectedId
            );
            setLinkInput(existingLink ? existingLink.linkUrl : '');
        } else {
            setCurrentCellId(null);
            setLinkInput('');
        }
    }, [selectedCells, cellLinks]);

    const activeCells = cells.filter(
        (cell) => !cellLinks.some((link) => link.cellId === cell.id) // 이미 링크가 있는 셀은 제외
    );

    const singleSelected = selectedCells.size === 1;
    const currentCell = cells.find((c) => c.id === currentCellId);

    const handleAddLink = () => {
        if (!currentCellId || !linkInput.trim()) {
            alert(
                '유효한 셀이 선택되었는지, 링크 주소가 입력되었는지 확인해주세요.'
            );
            return;
        }

        // 간단한 URL 유효성 검사 (http/https 시작 확인)
        const url = linkInput.trim();
        if (!/^https?:\/\/.*/i.test(url)) {
            alert('유효한 링크 주소를 입력해주세요 (예: https://example.com)');
            return;
        }

        addOrUpdateLink(currentCellId, url);
        setLinkInput('');
        setCurrentCellId(null);
        selectedCells.clear(); // 링크 추가 후 선택 해제
    };

    // Enter 키 이벤트 핸들러
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && singleSelected && linkInput.trim()) {
            e.preventDefault();
            handleAddLink();
        }
    };

    const getCellDisplayLabel = (cellId: string) => {
        const cell = cells.find((c) => c.id === cellId);
        if (!cell) return '알 수 없음';

        const displayCol = displayCols.get(cellId) ?? cell.col + 1;
        // return `${cell.row + 1}-${displayCol} (${cell.id})`;
        return `${cell.row + 1}-${displayCol}`;
    };

    return (
        <div className='bg-white pb-5 border-b border-gray-200 h-full flex flex-col'>
            <h3 className='font-bold text-lg text-gray-700 mb-4 flex items-center gap-2'>
                <Link className='w-5 h-5 text-indigo-600' />셀 링크 관리
            </h3>

            {/* 링크 입력 영역 */}
            <div className='mb-6 p-4 border rounded-lg bg-indigo-50'>
                <p className='text-sm font-semibold mb-2'>링크 적용 셀:</p>
                <div className='flex items-center gap-2 mb-3'>
                    {singleSelected && currentCell ? (
                        <>
                            <span className='bg-indigo-200 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-[3px]'>
                                {getCellDisplayLabel(currentCell.id)}
                            </span>
                            <span className='text-xs text-gray-500'>
                                (선택됨)
                            </span>
                        </>
                    ) : (
                        <span className='text-sm text-red-500 flex items-center gap-1'>
                            <AlertTriangle className='w-4 h-4' />
                            단일 셀을 선택하세요.
                        </span>
                    )}
                </div>
                <Input
                    type='url'
                    placeholder='링크 주소 (예: https://...)'
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={handleKeyDown} // onKeyDown 이벤트 핸들러 적용
                    disabled={!singleSelected}
                    className='w-full p-2 border border-gray-300 bg-white rounded-sm text-sm mb-3 disabled:bg-gray-100 truncate'
                />
                <Button
                    onClick={handleAddLink}
                    disabled={!singleSelected || !linkInput.trim()}
                    className='w-full bg-indigo-500 hover:bg-indigo-600'
                >
                    {/* <Plus className='w-4 h-4' /> */}
                    {cellLinks.some((link) => link.cellId === currentCellId) ? (
                        <>
                            <Pencil className='w-4 h-4' /> 링크 수정
                        </>
                    ) : (
                        <>
                            <Plus className='w-4 h-4' /> 링크 추가
                        </>
                    )}
                </Button>
            </div>

            {/* 링크 목록 영역 */}
            <div className='flex-grow overflow-y-auto'>
                <h4 className='font-semibold text-gray-700 mb-2'>
                    설정된 링크 목록 ({cellLinks.length}개)
                </h4>
                {cellLinks.length === 0 ? (
                    <p className='text-sm text-gray-500 py-4 text-center'>
                        설정된 링크가 없습니다.
                    </p>
                ) : (
                    <ul className='space-y-2'>
                        {cellLinks.map((link) => (
                            <li
                                key={link.cellId}
                                className='flex items-start justify-between p-2 bg-gray-50 rounded-lg border'
                            >
                                <div className='flex flex-col flex-grow min-w-0'>
                                    <span className='font-medium text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-[3px] self-start mb-1'>
                                        셀: {getCellDisplayLabel(link.cellId)}
                                    </span>
                                    <a
                                        href={link.linkUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-xs text-blue-600 hover:text-blue-800 truncate'
                                        title={link.linkUrl}
                                    >
                                        {link.linkUrl}
                                    </a>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            onClick={() =>
                                                removeLink(link.cellId)
                                            }
                                            className='text-red-500 hover:text-red-600'
                                        >
                                            <Trash2 className='w-4 h-4' />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>링크 삭제</p>
                                    </TooltipContent>
                                </Tooltip>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
