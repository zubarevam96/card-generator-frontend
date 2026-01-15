import { Injectable } from '@angular/core';
import { Card } from '../models/card.model';
import { Canvas } from '../models/canvas.model';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  constructor() {}

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

    // Create a hidden container with exact canvas dimensions and flexbox layout
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = canvas.canvasWidth + 'px';
    container.style.background = 'white';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.alignItems = 'flex-start';
    container.style.gap = canvas.distanceBetweenCards + 'px';
    // We'll compute and set height below so exported image includes canvas empty area
    document.body.appendChild(container);

    // Render each card with exact dimensions
    cards.forEach((card) => {
      const cardDiv = document.createElement('div');
      cardDiv.style.width = canvas.cardWidth + 'px';
      cardDiv.style.height = canvas.cardHeight + 'px';
      cardDiv.style.flexShrink = '0';
      cardDiv.style.boxSizing = 'border-box';
      cardDiv.style.overflow = 'hidden';
      cardDiv.innerHTML = card.renderedHtml;
      container.appendChild(cardDiv);
    });

    // Let the container size naturally to compute actual content height (with wrapping),
    // then clamp to at least canvas.canvasHeight so empty canvas area is preserved.
    container.style.height = 'auto';
    // Force a reflow so scrollHeight is correct
    const contentHeight = container.scrollHeight || container.clientHeight || canvas.cardHeight;
    const containerHeight = Math.max(contentHeight, canvas.canvasHeight);
    container.style.height = containerHeight + 'px';
    container.style.overflow = 'hidden';

    // Use html2canvas and jsPDF to generate PDF
    this.generatePdfWithLibraries(container, canvas, filename);
  }

  /**
   * Generate PDF using html2canvas and jsPDF libraries
   * Falls back to canvas-based PDF if libraries are not available
   */
  private generatePdfWithLibraries(container: HTMLElement, canvas: Canvas, filename: string): void {
    // Dynamic import to avoid requiring these as dependencies if not used
    Promise.all([
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    ]).then(() => {
      this.createPdfWithLibraries(container, canvas, filename);
    }).catch(() => {
      console.warn('PDF libraries not available, using fallback method');
      this.createSimplePdf(container, canvas, filename);
    });
  }

  /**
   * Create PDF using html2canvas and jsPDF with canvas dimensions
   */
  private createPdfWithLibraries(container: HTMLElement, canvas: Canvas, filename: string): void {
    const html2canvas = (window as any).html2canvas;
    const { jsPDF } = (window as any).jspdf;

    if (!html2canvas || !jsPDF) {
      this.createSimplePdf(container, canvas, filename);
      return;
    }

    html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: canvas.canvasWidth,
      height: container.scrollHeight
    }).then((canvasElement: HTMLCanvasElement) => {
      // Canvas dimensions in pixels (at 72 DPI) to millimeters
      const canvasWidthMm = canvas.canvasWidth * 0.264583;
      const canvasHeightMm = canvas.canvasHeight * 0.264583;

      // Calculate actual PDF height based on rendered content
      const contentHeightMm = (canvasElement.height / canvasElement.width) * canvasWidthMm;

      const orientation = canvasWidthMm > canvasHeightMm ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [canvasWidthMm, Math.max(canvasHeightMm, contentHeightMm)]
      });

      const imgData = canvasElement.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, canvasWidthMm, contentHeightMm);

      // Add additional pages if content height exceeds canvas height
      let heightLeft = contentHeightMm - canvasHeightMm;
      let position = -contentHeightMm;

      while (heightLeft > 0) {
        position = heightLeft - contentHeightMm;
        pdf.addPage([canvasWidthMm, canvasHeightMm]);
        pdf.addImage(imgData, 'PNG', 0, position, canvasWidthMm, contentHeightMm);
        heightLeft -= canvasHeightMm;
      }

      pdf.save(`${filename}.pdf`);
      this.cleanup();
    }).catch((error: any) => {
      console.error('Error generating PDF:', error);
      this.createSimplePdf(container, canvas, filename);
    });
  }

  /**
   * Create a simple PDF without external libraries
   */
  private createSimplePdf(container: HTMLElement, canvas: Canvas, filename: string): void {
    // Create a canvas from the HTML
    const pdfCanvas = document.createElement('canvas');
    const ctx = pdfCanvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      this.cleanup();
      return;
    }

    pdfCanvas.width = canvas.canvasWidth * 2; // 2x for better quality
    pdfCanvas.height = container.scrollHeight * 2;

    // Simple rendering
    const computedStyle = window.getComputedStyle(container);
    ctx.fillStyle = computedStyle.backgroundColor || 'white';
    ctx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'top';

    let y = 20;
    const lineHeight = 20;

    // Extract and render text content
    const text = container.innerText;
    const lines = text.split('\n');

    lines.forEach(line => {
      if (y > pdfCanvas.height - 50) {
        return;
      }
      ctx.fillText(line.substring(0, 80), 20, y);
      y += lineHeight;
    });

    // Convert canvas to blob and download
    pdfCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      this.cleanup();
    }, 'image/png');
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

  /**
   * Clean up temporary elements
   */
  private cleanup(): void {
    const container = document.querySelector('[style*="left: -9999px"]');
    if (container) {
      document.body.removeChild(container as HTMLElement);
    }
  }
}
