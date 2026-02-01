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

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  constructor(
    private canvasService: CanvasService,
    private sanitizer: DomSanitizer,
    private pdfExportService: PdfExportService,
    private cardStorageService: CardStorageService,
    private aliasService: AliasService
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
    const resolvedHtml = this.aliasService.applyAliasesToHtml(card.renderedHtml);
    return this.sanitizer.bypassSecurityTrustHtml(resolvedHtml);
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

  switchCanvas(canvas: Canvas) {
    this.canvasService.selectCanvas(canvas);
  }

  addNewCanvas() {
    this.canvasService.addCanvas();
  }

  deleteCanvas(canvasId: string) {
    if (this.canvases.length <= 1) {
      alert('Cannot delete the only canvas');
      return;
    }
    if (confirm('Delete this canvas and all its cards?')) {
      this.canvasService.deleteCanvas(canvasId);
    }
  }

  renameCanvas(canvasId: string) {
    const canvas = this.canvases.find(c => c.id === canvasId);
    if (canvas) {
      const newName = prompt('Enter new name:', canvas.name);
      if (newName && newName.trim()) {
        this.canvasService.renameCanvas(canvasId, newName.trim());
      }
    }
  }

  exportToPdf() {
    if (this.cards.length === 0) {
      alert('No cards to export');
      return;
    }
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
        }
      } catch (err) {
        alert('Invalid canvas JSON');
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
      }
    } catch (err) {
      alert('Invalid canvas JSON');
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

  private toPlainCanvas(canvas: Canvas) {
    return {
      id: canvas.id,
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
      name: template.name,
      templateHtml: template.templateHtml,
      variables: template.variables,
      canvasId: template.canvasId,
      hash: template.hash
    };
  }

  private toPlainCard(card: Card) {
    return {
      id: card.id,
      name: card.name,
      templateHtml: card.templateHtml,
      variables: card.variables,
      variableFontSizes: card.variableFontSizes,
      templateId: card.templateId,
      canvasId: card.canvasId,
      hash: card.hash
    };
  }
}