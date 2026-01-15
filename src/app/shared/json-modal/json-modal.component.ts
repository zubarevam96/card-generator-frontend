import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-json-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './json-modal.component.html',
  styleUrls: ['./json-modal.component.css']
})
export class JsonModalComponent implements AfterViewInit, OnChanges {
  @Input() visible = false;
  @Input() title = 'Export JSON';
  @Input() content = '';
  @Output() close = new EventEmitter<void>();
  @ViewChild('editorHost') editorHost!: ElementRef<HTMLDivElement>;

  private editor: any = null;
  private loaderStarted = false;
  editorReady = false;

  ngAfterViewInit(): void {
    if (this.visible) {
      this.ensureEditor();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      if (this.visible) {
        setTimeout(() => this.ensureEditor(), 0);
      } else {
        this.teardownEditor();
      }
    }
    if (changes['content'] && this.editor) {
      this.editor.setValue(this.content ?? '');
    }
  }

  onClose(): void {
    this.teardownEditor();
    this.close.emit();
  }

  copyContent(): void {
    if (!this.content) return;
    navigator.clipboard?.writeText(this.content).catch(() => {
      // no-op if clipboard fails
    });
  }

  private ensureEditor(): void {
    if (this.editor) {
      this.editor.setValue(this.content ?? '');
      return;
    }

    if ((window as any).CodeMirror && this.editorHost) {
      this.editor = (window as any).CodeMirror(this.editorHost.nativeElement, {
        value: this.content ?? '',
        lineNumbers: true,
        mode: { name: 'javascript', json: true },
        theme: 'eclipse',
        readOnly: true,
        lineWrapping: true,
        viewportMargin: Infinity
      });
      this.editorReady = true;
      return;
    }

    this.loadCodeMirrorAssets();
  }

  private loadCodeMirrorAssets(): void {
    if (this.loaderStarted) return;
    this.loaderStarted = true;

    if (!document.querySelector('link[data-cm-base]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css';
      link.dataset['cmBase'] = 'true';
      document.head.appendChild(link);
    }

    if (!document.querySelector('link[data-cm-theme-eclipse]')) {
      const themeLink = document.createElement('link');
      themeLink.rel = 'stylesheet';
      themeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/eclipse.min.css';
      themeLink.dataset['cmThemeEclipse'] = 'true';
      document.head.appendChild(themeLink);
    }

    if (!document.querySelector('script[data-cm-core]')) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js';
      script.dataset['cmCore'] = 'true';
      script.onload = () => this.loadJsonMode();
      document.head.appendChild(script);
    } else {
      this.loadJsonMode();
    }
  }

  private loadJsonMode(): void {
    if (!document.querySelector('script[data-cm-mode-json]')) {
      const modeScript = document.createElement('script');
      modeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js';
      modeScript.dataset['cmModeJson'] = 'true';
      modeScript.onload = () => setTimeout(() => this.ensureEditor(), 0);
      document.head.appendChild(modeScript);
    } else {
      setTimeout(() => this.ensureEditor(), 0);
    }
  }

  private teardownEditor(): void {
    if (this.editor) {
      try {
        this.editor.toTextArea?.();
      } catch {
        // ignore
      }
    }
    this.editor = null;
    this.editorReady = false;
  }
}
