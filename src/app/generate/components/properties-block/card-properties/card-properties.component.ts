import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CanvasService } from '../../../../services/canvas.service';
import { CardStorageService } from '../../../../services/card-storage.service';
import { Card } from '../../../../models/card.model';
import { Template } from '../../../../models/template.model';

declare var hljs: any; // Highlight.js global

@Component({
  selector: 'app-card-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './card-properties.component.html'
})
export class CardPropertiesComponent implements AfterViewInit {
  htmlText = '';
  cardName = '';
  localVariables: { [key: string]: string } = {};
  variableKeys: string[] = [];
  isEditingTemplate = false;
  highlightedCode: SafeHtml = '';
  private placeholderRegex = /{{(\w+)}}/g;

  constructor(private canvasService: CanvasService, private cardStorageService: CardStorageService, private sanitizer: DomSanitizer) {
    this.loadHighlightJs();
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
        setTimeout(() => {
          this.updateHighlight();
          this.updateCodeInputContent();
        }, 0);
      }
    });
  }

  ngAfterViewInit() {
    this.loadHighlightJs();
  }

  private loadHighlightJs() {
    if ((window as any).hljs) {
      return; // Already loaded
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css';
      document.head.appendChild(link);
    };
    document.head.appendChild(script);
  }

  onHtmlChange(event?: Event) {
    const editable = event?.target as HTMLElement;
    if (editable) {
      // Get plain text content without HTML formatting
      this.htmlText = editable.textContent || '';
    }
    this.updateHighlight();
    if (this.isEditingTemplate) {
      this.canvasService.updateTemplateHtml(this.htmlText);
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    // Insert plain text only
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  syncScroll(event: Event) {
    const source = event.target as HTMLElement;
    const wrapper = source.parentElement;
    if (!wrapper) return;
    
    const input = wrapper.querySelector('.code-input') as HTMLElement;
    const display = wrapper.querySelector('.code-display') as HTMLElement;
    
    if (source === input && display) {
      display.scrollTop = input.scrollTop;
      display.scrollLeft = input.scrollLeft;
    } else if (source === display && input) {
      input.scrollTop = display.scrollTop;
      input.scrollLeft = display.scrollLeft;
    }
  }

  private updateHighlight() {
    if ((window as any).hljs) {
      const highlighted = (window as any).hljs.highlight(this.htmlText, { language: 'html', ignoreIllegals: true }).value;
      this.highlightedCode = this.sanitizer.bypassSecurityTrustHtml(highlighted);
    }
  }

  private updateCodeInputContent() {
    const codeInput = document.querySelector('.code-input') as HTMLElement;
    if (codeInput) {
      codeInput.textContent = this.htmlText;
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