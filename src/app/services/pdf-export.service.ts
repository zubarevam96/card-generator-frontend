import { Injectable } from '@angular/core';
import { toPng } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { Card } from '../models/card.model';
import { Canvas } from '../models/canvas.model';
import { AliasService } from './alias.service';
import { LoggingService } from './logging.service';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  constructor(private aliasService: AliasService, private loggingService: LoggingService) {}

  /**
   * Export cards to PDF based on Canvas dimensions
   * @param cards - Array of cards to export
   * @param canvas - Canvas object containing dimensions
   * @param filename - Name of the PDF file (without .pdf extension)
   */
  exportCardsToPdf(cards: Card[], canvas: Canvas, filename: string = 'cards'): void {
    if (cards.length === 0) {
      this.loggingService.log('exporting', 'error', 'No cards to export');
      return;
    }

    this.loggingService.log('exporting', 'info', 'Starting PDF export', {
      cards: cards.length,
      canvasId: canvas.id,
      filename
    });

    // Calculate layout metrics (account for distanceFromBorders as margins)
    const margin = canvas.distanceFromBorders ?? 0;
    const availableWidth = Math.max(0, canvas.canvasWidth - margin * 2);
    const availableHeight = Math.max(0, canvas.canvasHeight - margin * 2);

    const cardWidthWithGap = canvas.cardWidth + canvas.distanceBetweenCards;
    const cardsPerRow = Math.max(1, Math.floor((availableWidth + canvas.distanceBetweenCards) / cardWidthWithGap));

    const cardHeightWithGap = canvas.cardHeight + canvas.distanceBetweenCards;
    const rowsPerPage = Math.max(1, Math.floor((availableHeight + canvas.distanceBetweenCards) / cardHeightWithGap));
    
    const cardsPerPage = cardsPerRow * rowsPerPage;

    this.loggingService.log('exporting', 'debug', 'Calculated page layout', {
      cardsPerRow,
      rowsPerPage,
      cardsPerPage
    });

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
    this.createMultiPagePdf(pages, canvas, cardsPerRow, filename).catch((error) => {
      this.loggingService.log('exporting', 'error', 'PDF export failed', {
        error: this.serializeError(error)
      });
    });
  }

  /**
   * Create PDF with multiple pages (one per page array)
   */
  private async createMultiPagePdf(pages: Card[][], canvas: Canvas, cardsPerRow: number, filename: string): Promise<void> {
    const mmToPt = (mm: number) => (mm * 72) / 25.4;
    const canvasWidthMm = canvas.canvasWidth * 0.264583;
    const canvasHeightMm = canvas.canvasHeight * 0.264583;
    const pageWidthPt = mmToPt(canvasWidthMm);
    const pageHeightPt = mmToPt(canvasHeightMm);

    const pdf = await PDFDocument.create();

    this.loggingService.log('exporting', 'debug', 'Rendering PDF pages', { pages: pages.length });

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const pageCards = pages[pageIndex];
      const container = this.createPageContainer(pageCards, canvas, cardsPerRow);
      try {
        this.loggingService.log('exporting', 'debug', 'Rendering page', {
          pageIndex,
          totalPages: pages.length,
          cardCount: pageCards.length
        });
        await this.waitForNextFrame();
        const prepareStart = performance.now();
        const failedImages = await this.withTimeout(
          this.prepareImages(container),
          8000,
          `prepare images for page ${pageIndex + 1}/${pages.length}`
        );
        if (failedImages.length > 0) {
          this.loggingService.log('exporting', 'error', 'Replacing failed images during export', {
            pageIndex,
            failedImages
          });
        }
        this.loggingService.log('exporting', 'debug', 'Prepared images', {
          pageIndex,
          failedCount: failedImages.length,
          durationMs: Math.round(performance.now() - prepareStart)
        });
        try {
          const dataUrl = await this.withTimeout(
            toPng(container, {
            backgroundColor: '#ffffff',
            cacheBust: true,
            imagePlaceholder: this.transparentPixel(),
              skipFonts: true,
            pixelRatio: Math.max(2, Math.floor((window as any).devicePixelRatio || 2)),
            width: canvas.canvasWidth,
            height: canvas.canvasHeight
            }),
            15000,
            `render page ${pageIndex + 1}/${pages.length}`
          );

          const imageBytes = this.dataUrlToUint8Array(dataUrl);
          const pngImage = await pdf.embedPng(imageBytes);
          const page = pdf.addPage([pageWidthPt, pageHeightPt]);
          page.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPt, height: pageHeightPt });
          this.loggingService.log('exporting', 'debug', 'Rendered page', {
            pageIndex,
            totalPages: pages.length
          });
        } catch (error) {
          this.loggingService.log('exporting', 'error', 'Failed to render PDF page', {
            pageIndex,
            cardIds: pageCards.map(card => card.id),
            error: this.serializeError(error)
          });
          throw error;
        }
      } finally {
        document.body.removeChild(container);
      }
    }

    const pdfBytes = await pdf.save();
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    this.loggingService.log('exporting', 'info', 'PDF export completed', {
      pages: pages.length,
      filename
    });
  }

  /**
   * Create a container with only the cards for one page
   */
  private createPageContainer(pageCards: Card[], canvas: Canvas, cardsPerRow: number): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '0';
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

    this.addCutGuides(container, canvas, cardsPerRow);

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

    });

    return container;
  }

  /**
   * Add thin dotted cut guides for card boundaries on the page
   */
  private addCutGuides(container: HTMLElement, canvas: Canvas, cardsPerRow: number): void {
    const padding = canvas.distanceFromBorders ?? 0;
    const gap = canvas.distanceBetweenCards;
    const cardWidth = canvas.cardWidth;
    const cardHeight = canvas.cardHeight;

    const availableWidth = Math.max(0, canvas.canvasWidth - padding * 2);
    const availableHeight = Math.max(0, canvas.canvasHeight - padding * 2);

    const cardsPerRowSafe = Math.max(1, cardsPerRow);
    const rowsPerPage = Math.max(1, Math.floor((availableHeight + gap) / (cardHeight + gap)));

    const color = 'rgba(0, 0, 0, 0.35)';
    const thickness = 1;
    const vSet = new Set<number>();
    const hSet = new Set<number>();

    // Vertical lines: left edge + right edge of each card
    for (let col = 0; col < cardsPerRowSafe; col += 1) {
      const left = padding + col * (cardWidth + gap);
      const right = left + cardWidth - 1;
      if (!vSet.has(left)) {
        vSet.add(left);
        this.drawVerticalGuide(container, left, canvas.canvasHeight, thickness, color, 2);
      }
      if (!vSet.has(right)) {
        vSet.add(right);
        this.drawVerticalGuide(container, right, canvas.canvasHeight, thickness, color, 2);
      }
    }

    // Horizontal lines: top edge + bottom edge of each card row
    for (let row = 0; row < rowsPerPage; row += 1) {
      const top = padding + row * (cardHeight + gap);
      const bottom = top + cardHeight - 1;
      if (!hSet.has(top)) {
        hSet.add(top);
        this.drawHorizontalGuide(container, top, canvas.canvasWidth, thickness, color, 2);
      }
      if (!hSet.has(bottom)) {
        hSet.add(bottom);
        this.drawHorizontalGuide(container, bottom, canvas.canvasWidth, thickness, color, 2);
      }
    }
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

  private drawVerticalGuide(
    container: HTMLElement,
    x: number,
    height: number,
    thickness: number,
    color: string,
    zIndex: number = 4
  ): void {
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.left = `${x}px`;
    line.style.top = '0';
    line.style.width = '0';
    line.style.height = `${height}px`;
    line.style.borderLeft = `${thickness}px dashed ${color}`;
    line.style.pointerEvents = 'none';
    line.style.zIndex = String(zIndex);
    container.appendChild(line);
  }

  private drawHorizontalGuide(
    container: HTMLElement,
    y: number,
    width: number,
    thickness: number,
    color: string,
    zIndex: number = 4
  ): void {
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.left = '0';
    line.style.top = `${y}px`;
    line.style.width = `${width}px`;
    line.style.height = '0';
    line.style.borderTop = `${thickness}px dashed ${color}`;
    line.style.pointerEvents = 'none';
    line.style.zIndex = String(zIndex);
    container.appendChild(line);
  }

  private dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1] ?? '';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private waitForNextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out after ${timeoutMs}ms: ${label}`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async prepareImages(container: HTMLElement): Promise<string[]> {
    const images = Array.from(container.querySelectorAll('img'));
    const failed: string[] = [];

    await Promise.all(
      images.map(async (img) => {
        const src = img.getAttribute('src') ?? '';
        if (!src) return;

        img.setAttribute('crossorigin', 'anonymous');
        img.setAttribute('referrerpolicy', 'no-referrer');

        const ok = await this.preloadImage(src);
        if (!ok) {
          failed.push(src);
          img.setAttribute('src', this.transparentPixel());
        }
      })
    );

    const failedBackgrounds = await this.prepareBackgroundImages(container);
    failed.push(...failedBackgrounds.map(url => `background:${url}`));

    return failed;
  }

  private async prepareBackgroundImages(container: HTMLElement): Promise<string[]> {
    const elements = Array.from(container.querySelectorAll<HTMLElement>('*'));
    if (elements.length === 0) return [];

    const usage = new Map<string, HTMLElement[]>();
    for (const element of elements) {
      const style = getComputedStyle(element);
      const background = style.backgroundImage;
      if (!background || background === 'none') continue;

      const urls = this.extractCssUrls(background);
      for (const url of urls) {
        if (!usage.has(url)) usage.set(url, []);
        usage.get(url)?.push(element);
      }
    }

    if (usage.size === 0) return [];

    const failed: string[] = [];
    await Promise.all(
      Array.from(usage.keys()).map(async (url) => {
        const ok = await this.preloadImage(url);
        if (!ok) {
          failed.push(url);
          const targets = usage.get(url) ?? [];
          for (const target of targets) {
            target.style.backgroundImage = 'none';
          }
        }
      })
    );

    return failed;
  }

  private extractCssUrls(value: string): string[] {
    const urls: string[] = [];
    const regex = /url\((['"]?)(.*?)\1\)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value))) {
      if (match[2]) urls.push(match[2]);
    }
    return urls;
  }

  private preloadImage(src: string, timeoutMs: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(false);
      }, timeoutMs);
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
      const finalize = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ok);
      };
      img.onload = () => finalize(true);
      img.onerror = () => finalize(false);
    });
  }

  private transparentPixel(): string {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  }

  private serializeError(error: unknown): { message?: string; stack?: string; name?: string; raw?: string; type?: string; targetSrc?: string } {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    if (error instanceof Event) {
      const target = error.target as HTMLImageElement | null;
      return {
        type: error.type,
        targetSrc: target?.src
      };
    }

    if (typeof error === 'string') {
      return { raw: error };
    }

    try {
      return { raw: JSON.stringify(error) };
    } catch {
      return { raw: String(error) };
    }
  }
}
