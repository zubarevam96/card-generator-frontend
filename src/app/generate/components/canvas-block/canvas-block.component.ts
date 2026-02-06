import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CanvasService } from '../../../services/canvas.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { Card } from '../../../models/card.model';
import { Template } from '../../../models/template.model';
import { ViewEncapsulation } from '@angular/core';
import { Canvas } from '../../../models/canvas.model';
import { CardStorageService } from '../../../services/card-storage.service';
import { JsonModalComponent } from '../../../shared/json-modal/json-modal.component';
import { AliasService } from '../../../services/alias.service';
import { LoggingService } from '../../../services/logging.service';

@Component({
  selector: 'app-canvas-block',
  standalone: true,
  imports: [CommonModule, JsonModalComponent],
  templateUrl: './canvas-block.component.html',
  styleUrls: ['./canvas-block.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class CanvasBlockComponent {
  cards: Card[] = [];
  selectedCardId: string | null = null;
  selectedCards: Card[] = [];
  canvas: Canvas = new Canvas();
  canvases: Canvas[] = [];
  selectedTemplate: Template | null = null;
  isEditingTemplate = false;
  cardPages: Card[][] = []; // Array of card arrays, one array per page
  cardsPerRowNum: number = 1;
  rowsPerPageNum: number = 1;
  templates: Template[] = [];
  showJsonModal = false;
  jsonModalTitle = '';
  jsonModalContent = '';

  private safeHtmlCache = new Map<string, { rendered: string; safe: SafeHtml }>();

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  constructor(
    private canvasService: CanvasService,
    private sanitizer: DomSanitizer,
    private pdfExportService: PdfExportService,
    private cardStorageService: CardStorageService,
    private aliasService: AliasService,
    private loggingService: LoggingService
  ) {
    this.canvasService.canvases$.subscribe(canvases => {
      this.canvases = canvases;
    });
    this.canvasService.selectedCanvas$.subscribe(canvas => {
      this.canvas = canvas;
      this.updateCardPages();
    });
    this.canvasService.cards$.subscribe(cards => {
      this.cards = cards;
      this.pruneSafeHtmlCache();
      this.updateCardPages();
    });
    this.canvasService.selectedCard$.subscribe(c => (this.selectedCardId = c?.id ?? null));
    this.canvasService.selectedCards$.subscribe(cards => (this.selectedCards = cards));
    this.canvasService.canvas$.subscribe(c => {
      this.canvas = c;
      this.updateCardPages();
    });
    this.canvasService.selectedTemplate$.subscribe(template => {
      this.selectedTemplate = template;
      this.isEditingTemplate = !!template;
    });

    this.cardStorageService.templates$.subscribe(templates => {
      this.templates = templates;
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
    const margin = this.canvas.distanceFromBorders ?? 0;

    // Calculate available area inside margins
    const availableWidth = Math.max(0, canvasWidth - margin * 2);
    const availableHeight = Math.max(0, canvasHeight - margin * 2);

    // Calculate how many cards fit horizontally and vertically per page
    const cardsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (cardWidth + gap)));
    const rowsPerPage = Math.max(1, Math.floor((availableHeight + gap) / (cardHeight + gap)));
    const cardsPerPage = cardsPerRow * rowsPerPage;

    this.loggingService.log('canvas-block', 'debug', 'Updated card pages layout', {
      cardsPerRow,
      rowsPerPage,
      cardsPerPage
    });

    // Store computed values for template bindings (grid layout)
    this.cardsPerRowNum = cardsPerRow;
    this.rowsPerPageNum = rowsPerPage;

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
    const rendered = card.renderedHtml;
    const cached = this.safeHtmlCache.get(card.id);
    if (cached && cached.rendered === rendered) {
      return cached.safe;
    }
    const resolvedHtml = this.aliasService.applyAliasesToHtml(rendered);
    const safe = this.sanitizer.bypassSecurityTrustHtml(resolvedHtml);
    this.safeHtmlCache.set(card.id, { rendered, safe });
    return safe;
  }

  getPreviewSafeHtml(): SafeHtml {
    if (!this.selectedTemplate) return this.sanitizer.bypassSecurityTrustHtml('');

    const { cleanedHtml, variables } = this.parseTemplateHtml(this.selectedTemplate.templateHtml);
    let html = cleanedHtml;
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    const resolvedHtml = this.aliasService.applyAliasesToHtml(html);
    return this.sanitizer.bypassSecurityTrustHtml(resolvedHtml);
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
    this.loggingService.log('canvas-block', 'debug', 'Selected card', { cardId: card.id });
  }

  onCardClick(card: Card, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey) {
      this.canvasService.toggleCardSelection(card);
      return;
    }

    this.selectCard(card);
  }

  selectCanvas() {
    this.canvasService.showCanvasProperties();
    this.loggingService.log('canvas-block', 'debug', 'Opened canvas properties');
  }

  isSelected(card: Card): boolean {
    return this.selectedCards.some(selected => selected.id === card.id);
  }

  trackByCardId(index: number, card: Card): string {
    return card.id;
  }

  trackByPageIndex(index: number): number {
    return index;
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.canvasService.closeTemplateEdit();
    }
  }

  switchCanvas(canvas: Canvas) {
    this.canvasService.selectCanvas(canvas);
    this.loggingService.log('canvas-block', 'info', 'Switched canvas', { canvasId: canvas.id });
  }

  addNewCanvas() {
    this.canvasService.addCanvas();
    this.loggingService.log('canvas-block', 'info', 'Added new canvas');
  }

  deleteCanvas(canvasId: string) {
    if (this.canvases.length <= 1) {
      alert('Cannot delete the only canvas');
      this.loggingService.log('canvas-block', 'error', 'Cannot delete the only canvas');
      return;
    }
    if (confirm('Delete this canvas and all its cards?')) {
      this.canvasService.deleteCanvas(canvasId);
      this.loggingService.log('canvas-block', 'info', 'Deleted canvas', { canvasId });
    }
  }

  renameCanvas(canvasId: string) {
    const canvas = this.canvases.find(c => c.id === canvasId);
    if (canvas) {
      const newName = prompt('Enter new name:', canvas.name);
      if (newName && newName.trim()) {
        this.canvasService.renameCanvas(canvasId, newName.trim());
        this.loggingService.log('canvas-block', 'info', 'Renamed canvas', {
          canvasId,
          name: newName.trim()
        });
      }
    }
  }

  async exportToPdf() {
    if (this.cards.length === 0) {
      alert('No cards to export');
      this.loggingService.log('canvas-block', 'error', 'No cards to export');
      return;
    }
    await this.canvasService.flushPendingTemplateUpdates();
    this.loggingService.log('canvas-block', 'info', 'Exporting cards to PDF', {
      cards: this.cards.length,
      canvasId: this.canvas.id
    });
    this.pdfExportService.exportCardsToPdf(this.cards, this.canvas, 'cards');
  }

  exportCanvasJson() {
    if (!this.canvas) return;
    const templatesForCanvas = this.templates.filter(t => t.canvasId === this.canvas.id);
    const cardsForCanvas = this.cards.filter(c => c.canvasId === this.canvas.id);

    const payload = {
      type: 'canvas',
      version: 1,
      canvas: this.toPlainCanvas(this.canvas),
      templates: templatesForCanvas.map(t => this.toPlainTemplate(t)),
      cards: cardsForCanvas.map(c => this.toPlainCard(c))
    };

    this.openJsonModal(`Export canvas: ${this.canvas.name}`, JSON.stringify(payload, null, 2));
    this.loggingService.log('canvas-block', 'info', 'Exported canvas JSON', { canvasId: this.canvas.id });
  }

  onCanvasImportChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const imported = this.canvasService.importCanvas(parsed);
        if (!imported) {
          alert('Invalid canvas JSON');
          this.loggingService.log('canvas-block', 'error', 'Invalid canvas JSON import');
        }
      } catch (err) {
        alert('Invalid canvas JSON');
        this.loggingService.log('canvas-block', 'error', 'Canvas JSON import failed', err);
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  importCanvasFromText() {
    const raw = prompt('Paste canvas JSON');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const imported = this.canvasService.importCanvas(parsed);
      if (!imported) {
        alert('Invalid canvas JSON');
        this.loggingService.log('canvas-block', 'error', 'Invalid canvas JSON import');
      }
    } catch (err) {
      alert('Invalid canvas JSON');
      this.loggingService.log('canvas-block', 'error', 'Canvas JSON import failed', err);
    }
  }

  closeJsonModal() {
    this.showJsonModal = false;
    this.jsonModalContent = '';
  }

  private openJsonModal(title: string, content: string) {
    this.jsonModalTitle = title;
    this.jsonModalContent = content;
    this.showJsonModal = true;
  }

  private pruneSafeHtmlCache() {
    const ids = new Set(this.cards.map(card => card.id));
    for (const key of this.safeHtmlCache.keys()) {
      if (!ids.has(key)) {
        this.safeHtmlCache.delete(key);
      }
    }
  }

  private toPlainCanvas(canvas: Canvas) {
    return {
      id: canvas.id,
      originalId: canvas.originalId,
      name: canvas.name,
      cardWidth: canvas.cardWidth,
      cardHeight: canvas.cardHeight,
      canvasWidth: canvas.canvasWidth,
      canvasHeight: canvas.canvasHeight,
      distanceBetweenCards: canvas.distanceBetweenCards,
      distanceFromBorders: canvas.distanceFromBorders,
      hash: canvas.hash
    };
  }

  private toPlainTemplate(template: Template) {
    return {
      id: template.id,
      originalId: template.originalId,
      name: template.name,
      templateHtml: template.templateHtml,
      variables: template.variables,
      canvasId: template.canvasId,
      hash: template.hash
    };
  }

  private toPlainCard(card: Card) {
    const template = this.templates.find(t => t.id === card.templateId);
    return {
      id: card.id,
      originalId: card.originalId,
      name: card.name,
      variables: card.variables,
      variableFontSizes: card.variableFontSizes,
      templateId: card.templateId,
      templateOriginalId: template?.originalId,
      templateHash: card.templateHash,
      canvasId: card.canvasId,
      hash: card.hash
    };
  }
}