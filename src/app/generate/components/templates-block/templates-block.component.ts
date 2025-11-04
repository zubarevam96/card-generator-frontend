import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardService } from '../../../services/card.service';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-block.component.html',
})
export class TemplatesBlockComponent {
    cards: Card[] = [];

    constructor(private cardService: CardService) {
        this.cardService.cards$.subscribe((cards: Card[]) => (this.cards = cards));
    }

    load(card: Card) {
        this.cardService.selectCard(card);
    }

    delete(card: Card) {
        this.cardService.deleteCard(card.id);
    }
}
