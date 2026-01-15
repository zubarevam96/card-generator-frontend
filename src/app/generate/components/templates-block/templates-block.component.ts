import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../../services/canvas.service';
import { CardStorageService } from '../../../services/card-storage.service';
import { Card } from '../../../models/card.model';
import { Template } from '../../../models/template.model';
import { JsonModalComponent } from '../../../shared/json-modal/json-modal.component';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule, JsonModalComponent],
  templateUrl: './templates-block.component.html',
  styleUrls: ['./templates-block.component.css']  // Add if new
})
export class TemplatesBlockComponent {
  templates: Template[] = [];
  cards: Card[] = [];
  expandedTemplates: Set<number> = new Set();  // For expand/collapse
  selectedCanvasId: number = 1;
  showJsonModal = false;
  jsonModalTitle = '';
  jsonModalContent = '';

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService) {
    this.cardStorageService.templates$.subscribe((templates: Template[]) => (this.templates = templates));
    this.canvasService.cards$.subscribe((cards: Card[]) => (this.cards = cards));
    this.canvasService.selectedCanvas$.subscribe(canvas => (this.selectedCanvasId = canvas.id));
  }

  getTemplatesForCanvas(): Template[] {
    return this.templates.filter(t => t.canvasId === this.selectedCanvasId);
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
    const blankTemplate = this.cardStorageService.addTemplate('New Template', '', this.selectedCanvasId);
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
    this.cardStorageService.addTemplate(card.name, card.templateHtml, this.selectedCanvasId);
  }

  // Duplicate a template (without copying its cards)
  duplicateTemplate(template: Template) {
    const name = template.name && template.name.trim().length > 0 ? `${template.name} (copy)` : 'Template (copy)';
    const newTemplate = this.cardStorageService.addTemplate(name, template.templateHtml, template.canvasId);
    // Optionally open the duplicated template in editor
    this.canvasService.editTemplate(newTemplate);
  }

  // Duplicate a card (copy current variables and linkage)
  duplicateCard(card: Card) {
    const name = card.name && card.name.trim().length > 0 ? `${card.name} (copy)` : 'Card (copy)';
    // Use CanvasService to ensure proper canvasId is applied
    this.canvasService.addCard(name, card.templateHtml, card.templateId, { ...card.variables });
  }

  exportTemplate(template: Template) {
    const linkedCards = this.getLinkedCards(template.id);
    const payload = {
      type: 'template',
      version: 1,
      template: this.toPlainTemplate(template),
      cards: linkedCards.map(card => this.toPlainCard(card))
    };
    this.openJsonModal(`Export template: ${template.name || 'undefined'}`, JSON.stringify(payload, null, 2));
  }

  onTemplateImportChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        this.importTemplatePayload(parsed);
      } catch (err) {
        alert('Invalid template JSON');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  importTemplateFromText() {
    const raw = prompt('Paste template JSON');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      this.importTemplatePayload(parsed);
    } catch (err) {
      alert('Invalid template JSON');
    }
  }

  closeJsonModal() {
    this.showJsonModal = false;
    this.jsonModalContent = '';
  }

  private importTemplatePayload(payload: any) {
    if (!payload) return;

    const templateData = payload.template ?? payload;
    const targetCanvasId = this.selectedCanvasId;
    const templateName = templateData.name && templateData.name.trim().length > 0 ? templateData.name : 'Imported Template';
    const templateHtml = templateData.templateHtml ?? '';
    const templateVariables = templateData.variables ?? {};

    const newTemplate = this.cardStorageService.addTemplate(templateName, templateHtml, targetCanvasId);
    // Persist any default variables carried on template
    newTemplate.variables = { ...templateVariables };
    this.cardStorageService.updateTemplate(newTemplate);

    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    cards.forEach((card: any, index: number) => {
      const cardName = card?.name && card.name.trim().length > 0 ? card.name : `Imported Card ${index + 1}`;
      const cardHtml = card?.templateHtml ?? templateHtml;
      const cardVars = card?.variables ?? {};
      this.cardStorageService.addCard(cardName, cardHtml, newTemplate.id, { ...cardVars }, targetCanvasId);
    });
  }

  private openJsonModal(title: string, content: string) {
    this.jsonModalTitle = title;
    this.jsonModalContent = content;
    this.showJsonModal = true;
  }

  private toPlainTemplate(template: Template) {
    return {
      id: template.id,
      name: template.name,
      templateHtml: template.templateHtml,
      variables: template.variables,
      canvasId: template.canvasId
    };
  }

  private toPlainCard(card: Card) {
    return {
      id: card.id,
      name: card.name,
      templateHtml: card.templateHtml,
      variables: card.variables,
      templateId: card.templateId,
      canvasId: card.canvasId
    };
  }
}