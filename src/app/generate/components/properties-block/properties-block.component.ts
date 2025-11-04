import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardService } from '../../../services/card.service';

@Component({
  selector: 'app-properties-block',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './properties-block.component.html'
})
export class PropertiesBlockComponent {
  htmlText = '';
  cardName = '';

  constructor(private cardService: CardService) {
    this.cardService.selectedCard$.subscribe(card => {
      this.htmlText = card?.html ?? '';
      this.cardName = card?.name ?? '';
    });
  }

  onHtmlChange() {
    this.cardService.updateSelectedHtml(this.htmlText);
  }

  saveNewCard() {
    if (this.cardName.trim()) {
      this.cardService.addCard(this.cardName, this.htmlText);
      this.cardName = '';
      this.htmlText = '';
    }
  }
}
