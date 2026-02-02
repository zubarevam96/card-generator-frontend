import { Component } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { CanvasService } from '../../../services/canvas.service';
import { CardStorageService } from '../../../services/card-storage.service';
import { Card } from '../../../models/card.model';
import { Template } from '../../../models/template.model';
import { JsonModalComponent } from '../../../shared/json-modal/json-modal.component';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, JsonModalComponent],
  templateUrl: './templates-block.component.html',
  styleUrls: ['./templates-block.component.css']  // Add if new
})
export class TemplatesBlockComponent {
  templates: Template[] = [];
  cards: Card[] = [];
  expandedTemplates: Set<string> = new Set();  // For expand/collapse
  selectedCanvasId: string = '';
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

  toggleExpand(templateId: string) {
    if (this.expandedTemplates.has(templateId)) {
      this.expandedTemplates.delete(templateId);
    } else {
      this.expandedTemplates.add(templateId);
    }
  }

  isExpanded(templateId: string): boolean {
    return this.expandedTemplates.has(templateId);
  }

  getLinkedCards(templateId: string): Card[] {
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
    const name = template.name && template.name.trim().length > 0 ? `${template.name}` : 'Template';
    const newTemplate = this.cardStorageService.addTemplate(name, template.templateHtml, template.canvasId);
    // Optionally open the duplicated template in editor
    this.canvasService.editTemplate(newTemplate);
  }

  // Duplicate a card (copy current variables and linkage)
  duplicateCard(card: Card) {
    const name = card.name && card.name.trim().length > 0 ? `${card.name}` : 'Card';
    // Use CanvasService to ensure proper canvasId is applied
    this.canvasService.addCard(name, card.templateHtml, card.templateId, { ...card.variables });
  }

  exportTemplate(template: Template) {
    const linkedCards = this.getLinkedCards(template.id);
    const payload = {
      type: 'template',
      version: 1,
      template: this.toPlainTemplate(template),
      cards: linkedCards.map(card => this.toPlainCard(card, false))
    };
    this.openJsonModal(`Export template: ${template.name || 'undefined'}`, JSON.stringify(payload, null, 2));
  }

  exportCard(card: Card) {
    const template = this.cardStorageService.getTemplateById(card.templateId);
    const payload = {
      type: 'card',
      version: 1,
      template: template ? this.toPlainTemplate(template) : undefined,
      card: this.toPlainCard(card, true)
    };
    this.openJsonModal(`Export card: ${card.name || 'undefined'}`, JSON.stringify(payload, null, 2));
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

    if (payload.type === 'card' && payload.card) {
      this.importCardPayload(payload);
      return;
    }

    const templateData = payload.template ?? payload;
    const targetCanvasId = this.selectedCanvasId;
    const templateName = templateData.name && templateData.name.trim().length > 0 ? templateData.name : 'Imported Template';
    const templateHtml = templateData.templateHtml ?? '';
    const templateVariables = templateData.variables ?? {};

    const resolvedTemplate = this.cardStorageService.resolveTemplateForImport({
      templateId: templateData?.id,
      templateOriginalId: templateData?.originalId ?? templateData?.id,
      templateHash: templateData?.hash,
      templateHtml,
      templateName,
      templateVariables,
      canvasId: targetCanvasId
    });

    const templateCache = new Map<string, Template>();
    this.cacheTemplateMatch(templateCache, resolvedTemplate);

    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    cards.forEach((card: any, index: number) => {
      const cardName = card?.name && card.name.trim().length > 0 ? card.name : `Imported Card ${index + 1}`;
      const cardHtml = card?.templateHtml ?? templateHtml;
      const cardVars = card?.variables ?? {};
      const cardFontSizes = card?.variableFontSizes ?? {};
      const matchedTemplate = this.resolveTemplateForCard(
        card,
        resolvedTemplate,
        targetCanvasId,
        cardHtml,
        templateCache
      );

      this.cardStorageService.addCard(
        cardName,
        cardHtml,
        matchedTemplate.id,
        { ...cardVars },
        targetCanvasId,
        { ...cardFontSizes },
        card?.originalId ?? card?.id
      );
    });
  }

  private importCardPayload(payload: any) {
    const card = payload.card;
    if (!card) return;

    const templateData = payload.template ?? {};
    const targetCanvasId = this.selectedCanvasId;

    const resolvedTemplate =
      this.findExistingTemplateForCard(card, templateData, targetCanvasId) ??
      this.cardStorageService.resolveTemplateForImport({
        templateId: card?.templateId ?? templateData?.id,
        templateOriginalId: card?.templateOriginalId ?? templateData?.originalId ?? card?.templateId,
        templateHash: card?.templateHash ?? templateData?.hash,
        templateHtml: card?.templateHtml ?? templateData?.templateHtml ?? '',
        templateName: templateData?.name,
        templateVariables: templateData?.variables,
        canvasId: targetCanvasId
      });

    const cardName = card?.name && card.name.trim().length > 0 ? card.name : 'Imported Card';
    const cardHtml = card?.templateHtml ?? resolvedTemplate.templateHtml;
    const cardVars = card?.variables ?? {};
    const cardFontSizes = card?.variableFontSizes ?? {};

    this.cardStorageService.addCard(
      cardName,
      cardHtml,
      resolvedTemplate.id,
      { ...cardVars },
      targetCanvasId,
      { ...cardFontSizes },
      card?.originalId ?? card?.id
    );
  }

  private resolveTemplateForCard(
    card: any,
    fallbackTemplate: Template,
    canvasId: string,
    templateHtml: string,
    cache: Map<string, Template>
  ): Template {
    const templateId = card?.templateId ?? fallbackTemplate.id;
    const templateOriginalId = card?.templateOriginalId ?? card?.templateId ?? fallbackTemplate.originalId;
    const templateHash = card?.templateHash ?? fallbackTemplate.hash;

    if (templateId) {
      const cachedById = cache.get(`id:${templateId}|${canvasId}`);
      if (cachedById) return cachedById;
    }

    if (templateOriginalId) {
      const cachedByOriginal = cache.get(`orig:${templateOriginalId}|${canvasId}`);
      if (cachedByOriginal) return cachedByOriginal;
    }

    if (templateHash) {
      const cachedByHash = cache.get(`hash:${templateHash}|${canvasId}`);
      if (cachedByHash) return cachedByHash;
    }

    const resolved = this.cardStorageService.resolveTemplateForImport({
      templateId,
      templateOriginalId,
      templateHash,
      templateHtml,
      templateName: card?.templateName ?? fallbackTemplate.name,
      canvasId
    });

    this.cacheTemplateMatch(cache, resolved);
    return resolved;
  }

  private findExistingTemplateForCard(card: any, templateData: any, canvasId: string): Template | null {
    const templates = this.cardStorageService.getAllTemplates().filter(t => t.canvasId === canvasId);
    const templateId = card?.templateId ?? templateData?.id;
    const templateOriginalId = card?.templateOriginalId ?? templateData?.originalId ?? card?.templateId;
    const templateHash = card?.templateHash ?? templateData?.hash;

    if (templateId) {
      const byId = templates.find(t => t.id === templateId);
      if (byId) return byId;
    }

    if (templateOriginalId) {
      const byOriginal = templates.find(t => t.originalId === templateOriginalId);
      if (byOriginal) return byOriginal;
    }

    if (templateHash) {
      const byHash = templates.find(t => t.hashUpToDate && t.hash === templateHash);
      if (byHash) return byHash;
    }

    return null;
  }

  private cacheTemplateMatch(cache: Map<string, Template>, template: Template) {
    cache.set(`id:${template.id}|${template.canvasId}`, template);
    if (template.originalId) {
      cache.set(`orig:${template.originalId}|${template.canvasId}`, template);
    }
    if (template.hashUpToDate) {
      cache.set(`hash:${template.hash}|${template.canvasId}`, template);
    }
  }

  private openJsonModal(title: string, content: string) {
    this.jsonModalTitle = title;
    this.jsonModalContent = content;
    this.showJsonModal = true;
  }

  private toPlainTemplate(template: Template) {
    return {
      id: template.id,
      originalId: template.originalId,
      name: template.name,
      templateHtml: template.templateHtml,
      variables: template.variables,
      canvasId: template.canvasId,
      hash: template.hash
    };
  }

  private toPlainCard(card: Card, includeTemplateHtml: boolean) {
    const template = this.cardStorageService.getTemplateById(card.templateId);
    const payload: any = {
      id: card.id,
      originalId: card.originalId,
      name: card.name,
      variables: card.variables,
      variableFontSizes: card.variableFontSizes,
      templateId: card.templateId,
      templateOriginalId: template?.originalId,
      templateHash: card.templateHash,
      canvasId: card.canvasId,
      hash: card.hash
    };

    if (includeTemplateHtml) {
      payload.templateHtml = template?.templateHtml ?? card.templateHtml;
    }

    return payload;
  }
}