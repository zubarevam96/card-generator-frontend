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
  localVariables: { [key: string]: string } = {};
  variableKeys: string[] = [];

  constructor(private canvasService: CanvasService) {
    this.canvasService.selectedCard$.subscribe((card: Card | null) => {
      this.htmlText = card?.renderedHtml ?? '';
      this.cardName = card?.name ?? '';
      this.isLocked = card?.isLocked ?? false;
      this.localVariables = { ...card?.variables };
      this.variableKeys = Object.keys(this.localVariables);
    });
  }

  onHtmlChange() {
    if (!this.isLocked) {
      this.canvasService.updateSelectedHtml(this.htmlText);
    }
  }

  onVariableChange(key: string) {
    this.canvasService.updateSelectedVariable(key, this.localVariables[key]);
  }

  saveNewCard() {
    if (this.cardName.trim()) {
      this.canvasService.addCard(this.cardName, this.htmlText);  // Defaults to unlocked, no variables
      this.cardName = '';
      this.htmlText = '';
    }
  }
}