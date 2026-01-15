import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../../services/canvas.service';
import { CardStorageService } from '../../../services/card-storage.service';
import { Card } from '../../../models/card.model';
import { Template } from '../../../models/template.model';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-block.component.html',
  styleUrls: ['./templates-block.component.css']  // Add if new
})
export class TemplatesBlockComponent {
  templates: Template[] = [];
  cards: Card[] = [];
  expandedTemplates: Set<number> = new Set();  // For expand/collapse

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService) {
    this.cardStorageService.templates$.subscribe((templates: Template[]) => (this.templates = templates));
    this.canvasService.cards$.subscribe((cards: Card[]) => (this.cards = cards));
  }

  toggleExpand(templateId: number) {
    if (this.expandedTemplates.has(templateId)) {
      this.expandedTemplates.delete(templateId);
    } else {
      this.expandedTemplates.add(templateId);
    }
  }

  isExpanded(templateId: number): boolean {
    return this.expandedTemplates.has(templateId);
  }

  getLinkedCards(templateId: number): Card[] {
    return this.cards.filter(card => card.templateId === templateId);
  }

  getUnlinkedCards(): Card[] {
    return this.cards.filter(card => {
      // Cards without a valid template are unlinked
      const template = this.cardStorageService.getTemplateById(card.templateId);
      return !template;
    });
  }

  loadTemplate(template: Template) {
    // Parse placeholders like {{key="default"}}, allowing hyphens in keys
    const placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;
    const variables: { [key: string]: string } = {};
    let match;

    // Extract variables from template defaults
    placeholderRegex.lastIndex = 0;
    while ((match = placeholderRegex.exec(template.templateHtml)) !== null) {
      const key = match[1];
      const defaultVal = match[2] ?? match[0].split('=')[1].trim();
      if (!variables[key]) {
        variables[key] = defaultVal;
      }
    }

    // Replace {{key="default"}} with {{key}} for the card instance
    const templateHtml = template.templateHtml.replace(/{{\s*([\w-]+)\s*=\s*(?:"[^"]*"|\d+)\s*}}/g, '{{$1}}');

    // Add the card as linked with variables and templateId
    const copyName = `${template.name} (from template)`;
    this.canvasService.addCard(copyName, templateHtml, template.id, variables);
  }

  newTemplate() {
    const blankTemplate = this.cardStorageService.addTemplate('New Template', '');
    // Edit the newly added template
    this.canvasService.editTemplate(blankTemplate);
  }

  editTemplate(template: Template) {
    this.canvasService.editTemplate(template);
  }

  deleteTemplate(template: Template) {
    this.cardStorageService.deleteTemplate(template.id);
  }

  selectCard(card: Card) {
    this.canvasService.selectCard(card);
  }

  removeCard(card: Card) {
    this.canvasService.deleteCard(card.id);
  }

  saveCardAsTemplate(card: Card) {
    this.cardStorageService.addTemplate(card.name, card.templateHtml);
  }
}