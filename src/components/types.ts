export interface Cell {
    id: string;
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
}

export interface DragSelection {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

// ✨ 추가: 셀에 적용될 링크 정보를 위한 인터페이스
export interface CellLink {
    cellId: string;
    linkUrl: string;
}


