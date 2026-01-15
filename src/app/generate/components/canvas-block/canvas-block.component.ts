import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CanvasService } from '../../../services/canvas.service';
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

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  constructor(private canvasService: CanvasService, private sanitizer: DomSanitizer) {
    this.canvasService.cards$.subscribe(cards => (this.cards = cards));
    this.canvasService.selectedCard$.subscribe(c => (this.selectedCardId = c?.id ?? null));
    this.canvasService.canvas$.subscribe(c => (this.canvas = c));
    this.canvasService.selectedTemplate$.subscribe(template => {
      this.selectedTemplate = template;
      this.isEditingTemplate = !!template;
    });
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
}