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
  isEditingTemplate = false;

  constructor(private canvasService: CanvasService) {
    this.canvasService.selectedCard$.subscribe((card: Card | null) => {
      if (card) {
        this.htmlText = card.renderedHtml;
        this.cardName = card.name;
        this.isLocked = card.isLocked;
        this.localVariables = { ...card.variables };
        this.variableKeys = Object.keys(this.localVariables);
        this.isEditingTemplate = false;
      }
    });

    this.canvasService.selectedTemplate$.subscribe((template: Card | null) => {
      if (template) {
        this.htmlText = template.templateHtml;
        this.cardName = template.name;
        this.isLocked = false;  // Always editable for templates
        this.localVariables = {};
        this.variableKeys = [];
        this.isEditingTemplate = true;
      }
    });
  }

  onHtmlChange() {
    if (this.isEditingTemplate) {
      this.canvasService.updateTemplateHtml(this.htmlText);
    } else if (!this.isLocked) {
      this.canvasService.updateSelectedHtml(this.htmlText);
    }
  }

  onNameChange() {
    if (this.isEditingTemplate) {
      this.canvasService.updateTemplateName(this.cardName);
    }
    // Optionally add for cards: this.canvasService.updateSelectedName(this.cardName);
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