import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../../services/canvas.service';
import { CardStorageService } from '../../../services/card-storage.service';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-block.component.html',
})
export class TemplatesBlockComponent {
  templates: Card[] = [];
  cards: Card[] = [];

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService) {
    this.cardStorageService.savedCards$.subscribe((cards: Card[]) => (this.templates = cards));
    this.canvasService.cards$.subscribe((cards: Card[]) => (this.cards = cards));
  }

  loadTemplate(template: Card) {
    // Parse placeholders like {{key="default"}}, allowing hyphens in keys
    const placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;
    const variables: { [key: string]: string } = {};
    let match;
    let templateHtml = template.templateHtml;

    while ((match = placeholderRegex.exec(template.templateHtml)) !== null) {
      const key = match[1];
      const defaultVal = match[2];
      if (!variables[key]) {
        variables[key] = defaultVal;
      }
    }

    // Replace {{key="default"}} with {{key}}
    templateHtml = template.templateHtml.replace(placeholderRegex, '{{$1}}');

    // Add the card as locked with variables
    const copyName = `${template.name} (from template)`;
    this.canvasService.addCard(copyName, templateHtml, true, variables);
  }

  deleteTemplate(template: Card) {
    this.cardStorageService.deleteCard(template.id);
  }

  selectCard(card: Card) {
    this.canvasService.selectCard(card);
  }

  removeCard(card: Card) {
    this.canvasService.deleteCard(card.id);
  }

  saveCardToTemplates(card: Card) {
    if (!card.isLocked) {
      this.cardStorageService.addCard(card.name, card.templateHtml, card.variables);
    }
  }
}