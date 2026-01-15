import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CanvasService } from '../../../services/canvas.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { Card } from '../../../models/card.model';
import { Template } from '../../../models/template.model';
import { ViewEncapsulation } from '@angular/core';
import { Canvas } from '../../../models/canvas.model';

@Component({
  selector: 'app-canvas-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas-block.component.html',
  styleUrls: ['./canvas-block.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class CanvasBlockComponent {
  cards: Card[] = [];
  selectedCardId: number | null = null;
  canvas: Canvas = new Canvas();
  selectedTemplate: Template | null = null;
  isEditingTemplate = false;
  cardPages: Card[][] = []; // Array of card arrays, one array per page

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  constructor(private canvasService: CanvasService, private sanitizer: DomSanitizer, private pdfExportService: PdfExportService) {
    this.canvasService.cards$.subscribe(cards => {
      this.cards = cards;
      this.updateCardPages();
    });
    this.canvasService.selectedCard$.subscribe(c => (this.selectedCardId = c?.id ?? null));
    this.canvasService.canvas$.subscribe(c => {
      this.canvas = c;
      this.updateCardPages();
    });
    this.canvasService.selectedTemplate$.subscribe(template => {
      this.selectedTemplate = template;
      this.isEditingTemplate = !!template;
    });
  }

  /**
   * Calculate which cards fit on each page based on canvas dimensions and card layout
   */
  private updateCardPages() {
    if (!this.canvas || this.cards.length === 0) {
      this.cardPages = [];
      return;
    }

    const gap = this.canvas.distanceBetweenCards;
    const cardWidth = this.canvas.cardWidth;
    const cardHeight = this.canvas.cardHeight;
    const canvasWidth = this.canvas.canvasWidth;
    const canvasHeight = this.canvas.canvasHeight;

    // Calculate how many cards fit horizontally and vertically per page
    const cardsPerRow = Math.floor((canvasWidth + gap) / (cardWidth + gap));
    const rowsPerPage = Math.floor((canvasHeight + gap) / (cardHeight + gap));
    const cardsPerPage = cardsPerRow * rowsPerPage;

    if (cardsPerRow <= 0 || rowsPerPage <= 0 || cardsPerPage <= 0) {
      // Cards don't fit at all, show at least one card per page
      this.cardPages = this.cards.map(card => [card]);
      return;
    }

    // Split cards into pages
    this.cardPages = [];
    for (let i = 0; i < this.cards.length; i += cardsPerPage) {
      this.cardPages.push(this.cards.slice(i, i + cardsPerPage));
    }
  }

  getSafeHtml(card: Card): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(card.renderedHtml);
  }

  getPreviewSafeHtml(): SafeHtml {
    if (!this.selectedTemplate) return this.sanitizer.bypassSecurityTrustHtml('');

    const { cleanedHtml, variables } = this.parseTemplateHtml(this.selectedTemplate.templateHtml);
    let html = cleanedHtml;
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private parseTemplateHtml(html: string): { cleanedHtml: string; variables: { [key: string]: string } } {
    const variables: { [key: string]: string } = {};
    let match: RegExpExecArray | null;
    while ((match = this.placeholderRegex.exec(html)) !== null) {
      const key = match[1];
      const defaultVal = match[2] ?? match[0].split('=')[1].trim();
      if (!variables[key]) {
        variables[key] = defaultVal;
      }
    }
    const cleanedHtml = html.replace(this.placeholderRegex, '{{$1}}');
    return { cleanedHtml, variables };
  }

  selectCard(card: Card) {
    this.canvasService.selectCard(card);
  }

  selectCanvas() {
    this.canvasService.showCanvasProperties();
  }

  isSelected(card: Card): boolean {
    return this.selectedCardId === card.id;
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.canvasService.closeTemplateEdit();
    }
  }

  exportToPdf() {
    if (this.cards.length === 0) {
      alert('No cards to export');
      return;
    }
    this.pdfExportService.exportCardsToPdf(this.cards, this.canvas, 'cards');
  }
}