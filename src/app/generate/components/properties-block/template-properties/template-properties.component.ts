import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../../../services/canvas.service';
import { CardStorageService } from '../../../../services/card-storage.service';
import { Template } from '../../../../models/template.model';

declare var CodeMirror: any; // CodeMirror global

@Component({
  selector: 'app-template-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-properties.component.html',
  styleUrls: ['./template-properties.component.css']
})
export class TemplatePropertiesComponent implements AfterViewInit {
  templateName = '';
  selectedTemplate: Template | null = null;
  selectedCanvasId: number = 1;
  private editor: any = null;

  constructor(
    private canvasService: CanvasService,
    private cardStorageService: CardStorageService
  ) {
    this.loadCodeMirror();

    this.canvasService.selectedTemplate$.subscribe((template: Template | null) => {
      if (template) {
        this.selectedTemplate = template;
        this.templateName = template.name;
        setTimeout(() => this.setEditorContent(template.templateHtml), 0);
      }
    });

    this.canvasService.selectedCanvas$.subscribe(canvas => (this.selectedCanvasId = canvas.id));
  }

  ngAfterViewInit() {
    setTimeout(() => this.initializeEditor(), 100);
  }

  private loadCodeMirror() {
    if ((window as any).CodeMirror) {
      return; // Already loaded
    }

    // Load CodeMirror CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css';
    document.head.appendChild(link);

    // Load HTML mode CSS for better syntax highlighting
    const modeLink = document.createElement('link');
    modeLink.rel = 'stylesheet';
    modeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/eclipse.min.css';
    document.head.appendChild(modeLink);

    // Load CodeMirror script
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js';
    script.onload = () => {
      // Load HTML mode
      const htmlMode = document.createElement('script');
      htmlMode.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/xml/xml.min.js';
      document.head.appendChild(htmlMode);
    };
    document.head.appendChild(script);
  }

  private initializeEditor() {
    if ((window as any).CodeMirror && !this.editor) {
      const editorDiv = document.getElementById('code-editor');
      if (editorDiv) {
        this.editor = (window as any).CodeMirror(editorDiv, {
          lineNumbers: true,
          mode: 'text/html',
          theme: 'eclipse',
          indentUnit: 2,
          indentWithTabs: false,
          lineWrapping: true,
          matchBrackets: true,
          autoCloseTags: true,
          height: '250px'
        });

        // Listen for changes
        this.editor.on('change', () => {
          const content = this.editor.getValue();
          this.canvasService.updateTemplateHtml(content);
        });

        // Set initial content if template is already selected
        if (this.selectedTemplate) {
          this.setEditorContent(this.selectedTemplate.templateHtml);
        }
      }
    }
  }

  private setEditorContent(content: string) {
    if (this.editor) {
      this.editor.setValue(content);
    }
  }

  onNameChange() {
    this.canvasService.updateTemplateName(this.templateName);
  }

  saveAsNewTemplate() {
    if (this.templateName.trim() && this.editor) {
      const content = this.editor.getValue();
      this.cardStorageService.addTemplate(this.templateName, content, this.selectedCanvasId);
      this.canvasService.closeTemplateEdit();
      this.templateName = '';
      if (this.editor) {
        this.editor.setValue('');
      }
    }
  }

  duplicateTemplate() {
    if (this.selectedTemplate && this.editor) {
      const content = this.editor.getValue();
      this.cardStorageService.addTemplate(`${this.selectedTemplate.name} copy`, content, this.selectedCanvasId);
    }
  }
}
