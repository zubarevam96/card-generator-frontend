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
  templateUrl: './card-properties.component.html',
  styleUrls: ['./card-properties.component.css']
})
export class CardPropertiesComponent {
  cardName = '';
  localVariables: { [key: string]: string } = {};
  localFontSizes: { [key: string]: number | null } = {};
  variableKeys: string[] = [];
  private placeholderRegex = /{{([\w-]+)}}/g;

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService) {
    this.canvasService.selectedCard$.subscribe((card: Card | null) => {
      if (card) {
        this.cardName = card.name;
        // Extract placeholder keys from the template
        const extractedKeys = this.extractPlaceholderKeys(card.templateHtml);
        // Initialize variables with existing values or empty strings
        this.localVariables = {};
        this.localFontSizes = {};
        extractedKeys.forEach(key => {
          this.localVariables[key] = card.variables[key] || '';
          const size = card.variableFontSizes?.[key];
          this.localFontSizes[key] = size !== undefined ? size : null;
        });
        this.variableKeys = extractedKeys;
      }
    });
  }

  onNameChange() {
    this.canvasService.updateSelectedName(this.cardName);
  }

  onVariableChange(key: string) {
    this.canvasService.updateSelectedVariable(key, this.localVariables[key]);
  }

  onFontSizeChange(key: string, value: number | string | null) {
    if (value === null || value === '') {
      this.localFontSizes[key] = null;
      this.canvasService.updateSelectedVariableFontSize(key, null);
      return;
    }

    const numeric = Number(value);
    this.localFontSizes[key] = Number.isFinite(numeric) ? numeric : null;
    this.canvasService.updateSelectedVariableFontSize(key, this.localFontSizes[key]);
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