import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../../services/canvas.service';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-block.component.html',
})
export class TemplatesBlockComponent {
  cards: Card[] = [];

  constructor(private canvasService: CanvasService) {
    this.canvasService.cards$.subscribe((cards: Card[]) => (this.cards = cards));
  }

  load(card: Card) {
    // Add a copy of the card to the canvas instead of selecting the original
    const copyName = `${card.name} copy`;
    this.canvasService.addCard(copyName, card.html);
  }

  delete(card: Card) {
    this.canvasService.deleteCard(card.id);
  }
}