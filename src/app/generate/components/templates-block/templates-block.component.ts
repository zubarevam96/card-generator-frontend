import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../../services/canvas.service';
import { CardStorageService } from '../../../services/card-storage.service';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-templates-block',  // Change to 'app-sidebar-block' if renaming
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
    // Add a locked copy to the canvas
    const copyName = `${template.name} (from template)`;
    this.canvasService.addCard(copyName, template.html, true);  // true = locked
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
    if (!card.isLocked) {  // Only save if not already template-based
      this.cardStorageService.addCard(card.name, card.html);
    }
  }
}