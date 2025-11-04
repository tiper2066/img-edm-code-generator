import { Cell, CellLink } from '@/components/types';

// 데이터 URL을 생성하고 캐싱하는 함수
async function generateAndCacheDataUrls({
    image,
    cells,
    horizontalLines,
    verticalLines,
    canvasRef,
}: {
    image: HTMLImageElement | null;
    cells: Cell[];
    horizontalLines: number[];
    verticalLines: number[];
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
}): Promise<Map<string, string>> {
    if (!image || !canvasRef.current) return new Map();

    const canvas = canvasRef.current;
    const tempFullCanvas = document.createElement('canvas');
    tempFullCanvas.width = canvas.width;
    tempFullCanvas.height = canvas.height;
    const tempFullCtx = tempFullCanvas.getContext('2d');
    if (!tempFullCtx) return new Map();

    tempFullCtx.drawImage(image, 0, 0, canvas.width, canvas.height);

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
    const newUrls = new Map<string, string>();

    for (const cell of cells) {
        const x = xPositions[cell.col];
        const y = yPositions[cell.row];
        const x2 = xPositions[cell.col + cell.colSpan];
        const y2 = yPositions[cell.row + cell.rowSpan];
        const w = x2 - x;
        const h = y2 - y;

        if (w <= 0 || h <= 0) continue;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) continue;

        tempCtx.drawImage(tempFullCanvas, x, y, w, h, 0, 0, w, h);

        const dataUrl = await new Promise<string>((resolve) => {
            tempCanvas.toBlob((blob) => {
                if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                } else {
                    resolve('');
                }
            }, 'image/png');
        });

        if (dataUrl) newUrls.set(cell.id, dataUrl);
    }

    return newUrls;
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

// HTML table 생성을 위한 함수
export async function generateHtmlTable({
    image,
    cells,
    deletedCells,
    horizontalLines,
    verticalLines,
    imageFileName,
    cellLinks,
    setIsGenerating,
    setCachedDataUrls,
    canvasRef,
    setHasCodeBeenGeneratedOnce,
    setBaseHtmlCode,
    setBasePreviewHtml,
}: {
    image: HTMLImageElement | null;
    cells: Cell[];
    deletedCells: Cell[];
    horizontalLines: number[];
    verticalLines: number[];
    imageFileName: string;
    cellLinks: CellLink[];
    setHtmlCode: React.Dispatch<React.SetStateAction<string>>;
    setPreviewHtml: React.Dispatch<React.SetStateAction<string>>;
    setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
    setCachedDataUrls: React.Dispatch<
        React.SetStateAction<Map<string, string>>
    >;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    setHasCodeBeenGeneratedOnce: React.Dispatch<React.SetStateAction<boolean>>;
    setBaseHtmlCode: React.Dispatch<React.SetStateAction<string>>;
    setBasePreviewHtml: React.Dispatch<React.SetStateAction<string>>;
}) {
    if (!image || !canvasRef.current) {
        alert('먼저 이미지를 업로드하고 그리드를 설정하세요.');
        return;
    }

    setIsGenerating(true);
    const canvas = canvasRef.current;
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
    const displayCols = getDisplayCols(activeCells);
    const cellLinkMap = new Map(
        cellLinks.map((link) => [link.cellId, link.linkUrl])
    );

    const cachedUrls = await generateAndCacheDataUrls({
        image,
        cells: activeCells,
        horizontalLines,
        verticalLines,
        canvasRef,
    });
    setCachedDataUrls(cachedUrls);

    const rowsCount = yPositions.length - 1;
    const colsCount = xPositions.length - 1;

    const tableStart = `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; max-width:${image.width}px; min-width:320px; border-collapse:collapse; border-spacing:0; margin:0; padding:0; table-layout:fixed;">\n`;
    let colgroup = '<colgroup>\n';
    for (let c = 0; c < colsCount; c++) {
        const colPixelWidth = xPositions[c + 1] - xPositions[c];
        // 너비를 픽셀(px) 대신 퍼센트(%)로 계산하여 적용합니다.
        const colPercentageWidth = (colPixelWidth / image.width) * 100;
        colgroup += `  <col style="width:${colPercentageWidth}%;">\n`;
    }
    colgroup += '</colgroup>\n';

    let pathHtml = tableStart + colgroup;
    let dataUrlHtml = tableStart + colgroup;

    const occupied = Array.from({ length: rowsCount }, () =>
        Array.from({ length: colsCount }, () => false)
    );

    for (let r = 0; r < rowsCount; r++) {
        pathHtml += '  <tr>\n';
        dataUrlHtml += '  <tr>\n';
        for (let c = 0; c < colsCount; c++) {
            if (occupied[r][c]) continue;

            const cell = activeCells.find(
                (cell) => cell.row === r && cell.col === c
            );
            if (cell) {
                const displayCol = displayCols.get(cell.id) ?? cell.col + 1;

                const x1 = xPositions[cell.col];
                const y1 = yPositions[cell.row];
                const x2 = xPositions[cell.col + cell.colSpan];
                const y2 = yPositions[cell.row + cell.rowSpan];

                const cellWidth = x2 - x1;
                const cellHeight = y2 - y1;
                const imgWidth = cellWidth;
                const imgHeight = cellHeight;

                const filename = `cell_${
                    cell.row + 1
                }-${displayCol}_${imgWidth}x${imgHeight}.png`;
                const cellImageName = `cell_${
                    cell.row + 1
                }-${displayCol}_${imgWidth}x${imgHeight}.png`;
                const imageNameWithoutExt = imageFileName.includes('.')
                    ? imageFileName.substring(0, imageFileName.lastIndexOf('.'))
                    : imageFileName;
                const imagePath = `https://img.pentasecurity.com/hr/email/${imageNameWithoutExt}/${cellImageName}`;

                const dataUrl = cachedUrls.get(cell.id) || '';
                const linkUrl = cellLinkMap.get(cell.id);

                const colspanAttr =
                    cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
                const rowspanAttr =
                    cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
                const tdStart = `   <td${colspanAttr}${rowspanAttr} style="padding:0; margin:0; line-height:0; font-size:0; vertical-align:top; border:none; border-spacing:0;">\n`;
                const imgTagPath = `<img src="${imagePath}" alt="Cell ${
                    r + 1
                }-${displayCol}" style="display:block; width:100%; max-width:${imgWidth}px; height:auto; margin:0; padding:0; border:none; vertical-align:top;" loading="lazy" />`;
                const imgTagDataUrl = dataUrl
                    ? `<img src="${dataUrl}" alt="Cell ${
                          r + 1
                      }-${displayCol}" style="display:block; width:100%; max-width:${imgWidth}px; height:auto; margin:0; padding:0; border:none; vertical-align:top;" loading="lazy" />`
                    : '';

                const pathContent = linkUrl
                    ? `<a href="${linkUrl}" target="_blank" style="display:block; padding:0; margin:0; line-height:0; font-size:0;">${imgTagPath}</a>`
                    : imgTagPath;
                const dataUrlContent = linkUrl
                    ? `<a href="${linkUrl}" target="_blank" style="display:block; padding:0; margin:0; line-height:0; font-size:0;">${imgTagDataUrl}</a>`
                    : imgTagDataUrl;

                pathHtml += tdStart + `      ${pathContent}\n    </td>\n`;
                dataUrlHtml +=
                    tdStart +
                    (dataUrlContent
                        ? `      ${dataUrlContent}\n`
                        : `      \n`) +
                    `    </td>\n`;

                for (let rowBlock = 0; rowBlock < cell.rowSpan; rowBlock++) {
                    for (
                        let colBlock = 0;
                        colBlock < cell.colSpan;
                        colBlock++
                    ) {
                        if (
                            r + rowBlock < rowsCount &&
                            c + colBlock < colsCount
                        ) {
                            occupied[r + rowBlock][c + colBlock] = true;
                        }
                    }
                }
            } else if (
                !deletedCells.some(
                    (d) =>
                        d.row <= r &&
                        d.row + d.rowSpan > r &&
                        d.col <= c &&
                        d.col + d.colSpan > c
                )
            ) {
                const emptyTd = `    <td style="padding:0; margin:0; line-height:0; font-size:0; vertical-align:top; border:none; border-spacing:0;">&nbsp;</td>\n`;
                pathHtml += emptyTd;
                dataUrlHtml += emptyTd;
                occupied[r][c] = true;
            }
        }
        pathHtml += '  </tr>\n';
        dataUrlHtml += '  </tr>\n';
    }

    pathHtml += '</table>';
    dataUrlHtml += '</table>';

    setBaseHtmlCode(pathHtml);
    setBasePreviewHtml(dataUrlHtml);
    setIsGenerating(false);
    setHasCodeBeenGeneratedOnce(true);
}
