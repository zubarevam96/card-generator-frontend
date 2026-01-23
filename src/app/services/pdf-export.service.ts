import { Injectable } from '@angular/core';
import { Card } from '../models/card.model';
import { Canvas } from '../models/canvas.model';
import { AliasService } from './alias.service';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  constructor(private aliasService: AliasService) {}

  /**
   * Export cards to PDF based on Canvas dimensions
   * @param cards - Array of cards to export
   * @param canvas - Canvas object containing dimensions
   * @param filename - Name of the PDF file (without .pdf extension)
   */
  exportCardsToPdf(cards: Card[], canvas: Canvas, filename: string = 'cards'): void {
    if (cards.length === 0) {
      console.warn('No cards to export');
      return;
    }

    // Calculate layout metrics (account for distanceFromBorders as margins)
    const margin = canvas.distanceFromBorders ?? 0;
    const availableWidth = Math.max(0, canvas.canvasWidth - margin * 2);
    const availableHeight = Math.max(0, canvas.canvasHeight - margin * 2);

    const cardWidthWithGap = canvas.cardWidth + canvas.distanceBetweenCards;
    const cardsPerRow = Math.max(1, Math.floor((availableWidth + canvas.distanceBetweenCards) / cardWidthWithGap));

    const cardHeightWithGap = canvas.cardHeight + canvas.distanceBetweenCards;
    const rowsPerPage = Math.max(1, Math.floor((availableHeight + canvas.distanceBetweenCards) / cardHeightWithGap));
    
    const cardsPerPage = cardsPerRow * rowsPerPage;

    // Split cards into pages
    const pages: Card[][] = [];
    for (let i = 0; i < cards.length; i += cardsPerPage) {
      pages.push(cards.slice(i, i + cardsPerPage));
    }

    // Generate PDF with multiple pages
    this.generatePdfPages(pages, canvas, cardsPerRow, filename);
  }

  /**
   * Generate PDF with card-aware page breaks
   */
  private generatePdfPages(pages: Card[][], canvas: Canvas, cardsPerRow: number, filename: string): void {
    Promise.all([
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    ]).then(() => {
      this.createMultiPagePdf(pages, canvas, cardsPerRow, filename);
    }).catch(() => {
      console.warn('PDF libraries not available');
    });
  }

  /**
   * Create PDF with multiple pages (one per page array)
   */
  private createMultiPagePdf(pages: Card[][], canvas: Canvas, cardsPerRow: number, filename: string): void {
    const html2canvas = (window as any).html2canvas;
    const { jsPDF } = (window as any).jspdf;

    if (!html2canvas || !jsPDF) {
      return;
    }

    // Convert canvas dimensions to mm
    const canvasWidthMm = canvas.canvasWidth * 0.264583;
    const canvasHeightMm = canvas.canvasHeight * 0.264583;
    const orientation = canvasWidthMm > canvasHeightMm ? 'landscape' : 'portrait';

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [canvasWidthMm, canvasHeightMm]
    });

    // Process each page
    let isFirstPage = true;
    let pagePromise = Promise.resolve();

    pages.forEach((pageCards, pageIndex) => {
      pagePromise = pagePromise.then(() => {
        return new Promise<void>((resolve) => {
          // Create container for this page
          const container = this.createPageContainer(pageCards, canvas, cardsPerRow);
          
                // Render the container (which includes padding for margins)
                html2canvas(container, {
            scale: Math.max(2, Math.floor((window as any).devicePixelRatio || 2)),
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: canvas.canvasWidth,
            height: canvas.canvasHeight
          }).then((canvasElement: HTMLCanvasElement) => {
            const imgData = canvasElement.toDataURL('image/png');
            
            if (!isFirstPage) {
              pdf.addPage([canvasWidthMm, canvasHeightMm]);
            }
            isFirstPage = false;
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvasWidthMm, canvasHeightMm);
            document.body.removeChild(container);
            
            resolve();
          });
        });
      });
    });

    pagePromise.then(() => {
      pdf.save(`${filename}.pdf`);
    });
  }

  /**
   * Create a container with only the cards for one page
   */
  private createPageContainer(pageCards: Card[], canvas: Canvas, cardsPerRow: number): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = canvas.canvasWidth + 'px';
    container.style.height = canvas.canvasHeight + 'px';
    container.style.background = 'white';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';
      container.style.display = 'grid';
      container.style.gridTemplateColumns = `repeat(${Math.max(1, cardsPerRow)}, ${canvas.cardWidth}px)`;
      container.style.gridAutoRows = canvas.cardHeight + 'px';
      container.style.columnGap = canvas.distanceBetweenCards + 'px';
      container.style.rowGap = canvas.distanceBetweenCards + 'px';
    // Apply padding equal to distanceFromBorders so cards are placed inside page margins
    container.style.padding = (canvas.distanceFromBorders ?? 0) + 'px';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    // Add cards to container
    pageCards.forEach((card, index) => {
      const cardDiv = document.createElement('div');
      cardDiv.style.width = canvas.cardWidth + 'px';
      cardDiv.style.height = canvas.cardHeight + 'px';
      cardDiv.style.boxSizing = 'border-box';
      cardDiv.style.overflow = 'hidden';
      cardDiv.style.border = '1px solid #ddd';
      cardDiv.style.borderRadius = '0';
      cardDiv.style.backgroundColor = '#fff';
      cardDiv.style.position = 'relative';
      cardDiv.style.zIndex = '10';
      cardDiv.innerHTML = this.aliasService.applyAliasesToHtml(card.renderedHtml);
      container.appendChild(cardDiv);

      this.addCropMarks(container, index, canvas, cardsPerRow);
    });

    return container;
  }

  /**
   * Add small crop marks at the four card corners to help with cutting
   */
  private addCropMarks(container: HTMLElement, cardIndex: number, canvas: Canvas, cardsPerRow: number): void {
    const padding = canvas.distanceFromBorders ?? 0;
    const gap = canvas.distanceBetweenCards;
    const cardWidth = canvas.cardWidth;
    const cardHeight = canvas.cardHeight;

    const col = cardIndex % cardsPerRow;
    const row = Math.floor(cardIndex / cardsPerRow);

    const left = padding + col * (cardWidth + gap);
    const top = padding + row * (cardHeight + gap);
    const right = left + cardWidth;
    const bottom = top + cardHeight;

    const thickness = 1;
    this.ensureGuideLines(container, left, right, top, bottom, thickness, canvas);
  }

  private ensureGuideLines(
    container: HTMLElement,
    left: number,
    right: number,
    top: number,
    bottom: number,
    thickness: number,
    canvas: Canvas
  ): void {
    const keyStore = (container as any).__guideSet as Set<string> | undefined;
    const guideSet = keyStore ?? new Set<string>();
    if (!keyStore) {
      (container as any).__guideSet = guideSet;
    }

    const color = 'rgba(0, 0, 0, 0.45)';

    const addVertical = (x: number) => {
      const key = `v-${x}`;
      if (guideSet.has(key)) return;
      guideSet.add(key);
      this.drawVerticalGuide(container, x, canvas.canvasHeight, thickness, color);
    };

    const addHorizontal = (y: number) => {
      const key = `h-${y}`;
      if (guideSet.has(key)) return;
      guideSet.add(key);
      this.drawHorizontalGuide(container, y, canvas.canvasWidth, thickness, color);
    };

    addVertical(left + 1);   // left edge, shift right into card
    addVertical(right - 1);  // right edge, shift left into card
    addHorizontal(top + 1);  // top edge, shift down into card
    addHorizontal(bottom - 1); // bottom edge, shift up into card
  }

  private drawVerticalGuide(container: HTMLElement, x: number, height: number, thickness: number, color: string): void {
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.left = `${x}px`;
    line.style.top = '0';
    line.style.width = '0';
    line.style.height = `${height}px`;
    line.style.borderLeft = `${thickness}px dashed ${color}`;
    line.style.pointerEvents = 'none';
    line.style.zIndex = '4';
    container.appendChild(line);
  }

  private drawHorizontalGuide(container: HTMLElement, y: number, width: number, thickness: number, color: string): void {
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.left = '0';
    line.style.top = `${y}px`;
    line.style.width = `${width}px`;
    line.style.height = '0';
    line.style.borderTop = `${thickness}px dashed ${color}`;
    line.style.pointerEvents = 'none';
    line.style.zIndex = '4';
    container.appendChild(line);
  }

  /**
   * Load external script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any)[this.getScriptVariable(src)]) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  /**
   * Get the global variable name for a script
   */
  private getScriptVariable(src: string): string {
    if (src.includes('html2canvas')) return 'html2canvas';
    if (src.includes('jspdf')) return 'jsPDF';
    return 'undefined';
  }
}
