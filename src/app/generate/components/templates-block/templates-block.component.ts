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
        this.canvasService.selectCard(card);
    }

    delete(card: Card) {
        this.canvasService.deleteCard(card.id);
    }
}
