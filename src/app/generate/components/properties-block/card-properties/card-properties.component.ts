import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../../../services/canvas.service';
import { CardStorageService } from '../../../../services/card-storage.service';
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

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService) {
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
    } else {
      this.canvasService.updateSelectedName(this.cardName);
    }
  }

  onVariableChange(key: string) {
    this.canvasService.updateSelectedVariable(key, this.localVariables[key]);
  }

  saveNew() {  // Reworked to save new template only
    if (this.cardName.trim()) {
      this.cardStorageService.addCard(this.cardName, this.htmlText);
      this.cardName = '';
      this.htmlText = '';
    }
  }

  editTemplate() {
    const selectedCard = this.canvasService.getSelectedCard();
    if (selectedCard && selectedCard.templateId) {
      const template = this.cardStorageService.getTemplateById(selectedCard.templateId);
      if (template) {
        this.canvasService.editTemplate(template);
      }
    }
  }

  duplicateTemplate() {
    const template = this.canvasService.getSelectedTemplate();
    if (template) {
      this.cardStorageService.addCard(`${template.name} copy`, template.templateHtml, { ...template.variables });
    }
  }
}