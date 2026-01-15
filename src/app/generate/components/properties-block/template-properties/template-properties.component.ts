import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CanvasService } from '../../../../services/canvas.service';
import { CardStorageService } from '../../../../services/card-storage.service';
import { Template } from '../../../../models/template.model';

declare var hljs: any; // Highlight.js global

@Component({
  selector: 'app-template-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-properties.component.html',
  styleUrls: ['./template-properties.component.css']
})
export class TemplatePropertiesComponent implements AfterViewInit {
  htmlText = '';
  templateName = '';
  highlightedCode: SafeHtml = '';
  selectedTemplate: Template | null = null;

  constructor(
    private canvasService: CanvasService,
    private cardStorageService: CardStorageService,
    private sanitizer: DomSanitizer
  ) {
    this.loadHighlightJs();

    this.canvasService.selectedTemplate$.subscribe((template: Template | null) => {
      if (template) {
        this.selectedTemplate = template;
        this.htmlText = template.templateHtml;
        this.templateName = template.name;
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
      this.htmlText = editable.textContent || '';
    }
    this.updateHighlight();
    this.canvasService.updateTemplateHtml(this.htmlText);
  }

  onNameChange() {
    this.canvasService.updateTemplateName(this.templateName);
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
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

  saveAsNewTemplate() {
    if (this.templateName.trim()) {
      this.cardStorageService.addTemplate(this.templateName, this.htmlText);
      this.canvasService.closeTemplateEdit();
      this.htmlText = '';
      this.templateName = '';
    }
  }

  duplicateTemplate() {
    if (this.selectedTemplate) {
      this.cardStorageService.addTemplate(`${this.selectedTemplate.name} copy`, this.selectedTemplate.templateHtml);
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
}
