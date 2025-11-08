import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../../../services/canvas.service';
import { Card } from '../../../../models/card.model';

@Component({
  selector: 'app-card-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './card-properties.component.html'
})
export class CardPropertiesComponent {
  htmlText = '';
  cardName = '';
  isLocked = false;

  constructor(private canvasService: CanvasService) {
    this.canvasService.selectedCard$.subscribe((card: Card | null) => {
      this.htmlText = card?.html ?? '';
      this.cardName = card?.name ?? '';
      this.isLocked = card?.isLocked ?? false;
    });
  }

  onHtmlChange() {
    if (!this.isLocked) {
      this.canvasService.updateSelectedHtml(this.htmlText);
    }
  }

  saveNewCard() {
    if (this.cardName.trim()) {
      this.canvasService.addCard(this.cardName, this.htmlText);  // Defaults to unlocked
      this.cardName = '';
      this.htmlText = '';
    }
  }
}