// src/app/generate/components/canvas-block/canvas-block.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CanvasService } from '../../../services/canvas.service';
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
  cardWidth = 200;
  cardHeight = 280;

  constructor(private canvasService: CanvasService, private sanitizer: DomSanitizer) {
    this.canvasService.cards$.subscribe(cards => (this.cards = cards));
    this.canvasService.selectedCard$.subscribe(c => (this.selectedCardId = c?.id ?? null));
  }

  getSafeHtml(card: Card): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(card.html);
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
}
