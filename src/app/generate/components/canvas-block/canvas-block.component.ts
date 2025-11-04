import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CardService } from '../../../services/card.service';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-canvas-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas-block.component.html',
  styleUrls: ['./canvas-block.component.css']
})
export class CanvasBlockComponent {
  cards: Card[] = [];
  selectedCardId: number | null = null;
  cardWidth = 250;
  cardHeight = 280;

  constructor(private cardService: CardService, private sanitizer: DomSanitizer) {
    this.cardService.cards$.subscribe(cards => (this.cards = cards));
    this.cardService.selectedCard$.subscribe(c => (this.selectedCardId = c?.id ?? null));
  }

  getSafeHtml(card: Card): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(card.html);
  }

  selectCard(card: Card) {
    this.cardService.selectCard(card);
  }

  isSelected(card: Card): boolean {
    return this.selectedCardId === card.id;
  }
}
