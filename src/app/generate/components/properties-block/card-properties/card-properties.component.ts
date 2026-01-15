import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../../../services/canvas.service';
import { CardStorageService } from '../../../../services/card-storage.service';
import { Card } from '../../../../models/card.model';
import { Template } from '../../../../models/template.model';

@Component({
  selector: 'app-card-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './card-properties.component.html'
})
export class CardPropertiesComponent {
  htmlText = '';
  cardName = '';
  localVariables: { [key: string]: string } = {};
  variableKeys: string[] = [];
  isEditingTemplate = false;
  private placeholderRegex = /{{(\w+)}}/g;

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService) {
    this.canvasService.selectedCard$.subscribe((card: Card | null) => {
      if (card) {
        this.htmlText = card.renderedHtml;
        this.cardName = card.name;
        // Extract placeholder keys from the template
        const extractedKeys = this.extractPlaceholderKeys(card.templateHtml);
        // Initialize variables with existing values or empty strings
        this.localVariables = {};
        extractedKeys.forEach(key => {
          this.localVariables[key] = card.variables[key] || '';
        });
        this.variableKeys = extractedKeys;
        this.isEditingTemplate = false;
      }
    });

    this.canvasService.selectedTemplate$.subscribe((template: Template | null) => {
      if (template) {
        this.htmlText = template.templateHtml;
        this.cardName = template.name;
        this.localVariables = {};
        this.variableKeys = [];
        this.isEditingTemplate = true;
      }
    });
  }

  onHtmlChange() {
    if (this.isEditingTemplate) {
      this.canvasService.updateTemplateHtml(this.htmlText);
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

  saveNew() {  // Save current template as a new template
    if (this.cardName.trim()) {
      this.cardStorageService.addTemplate(this.cardName, this.htmlText);
      this.cardName = '';
      this.htmlText = '';
    }
  }

  editTemplate() {
    const selectedCard = this.canvasService.getSelectedCard();
    if (selectedCard) {
      const template = this.cardStorageService.getTemplateById(selectedCard.templateId);
      if (template) {
        this.canvasService.editTemplate(template);
      }
    }
  }

  duplicateTemplate() {
    const template = this.canvasService.getSelectedTemplate();
    if (template) {
      this.cardStorageService.addTemplate(`${template.name} copy`, template.templateHtml);
    }
  }

  private extractPlaceholderKeys(html: string): string[] {
    const keys = new Set<string>();
    let match;
    this.placeholderRegex.lastIndex = 0;
    while ((match = this.placeholderRegex.exec(html)) !== null) {
      keys.add(match[1]);
    }
    return Array.from(keys);
  }
}