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

  constructor(private canvasService: CanvasService) {
    // subscribe to currently selected card
    this.canvasService.selectedCard$.subscribe((card: Card | null) => {
      this.htmlText = card?.html ?? '';
      this.cardName = card?.name ?? '';
    });
  }

  onHtmlChange() {
    this.canvasService.updateSelectedHtml(this.htmlText);
  }

  saveNewCard() {
    if (this.cardName.trim()) {
      this.canvasService.addCard(this.cardName, this.htmlText);
      this.cardName = '';
      this.htmlText = '';
    }
  }
}
