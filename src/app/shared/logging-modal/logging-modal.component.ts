import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoggingService, LogFileMeta, LogLevel } from '../../services/logging.service';

@Component({
  selector: 'app-logging-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logging-modal.component.html',
  styleUrls: ['./logging-modal.component.css']
})
export class LoggingModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  modules: string[] = [];
  selectedModule = '';
  moduleLevel: LogLevel = 'info';
  files: LogFileMeta[] = [];
  selectedFileId: string | null = null;
  fileContent = '';

  readonly levels: LogLevel[] = ['error', 'info', 'debug'];

  constructor(private loggingService: LoggingService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.refresh();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  refresh(): void {
    this.modules = this.loggingService.getModules();
    if (!this.selectedModule || !this.modules.includes(this.selectedModule)) {
      this.selectedModule = this.modules[0] ?? '';
    }
    this.loadModule(this.selectedModule);
  }

  loadModule(module: string): void {
    this.selectedModule = module;
    this.moduleLevel = this.loggingService.getModuleLevel(module);
    this.files = this.loggingService.getLogFiles(module);
    const latest = this.files[this.files.length - 1];
    this.selectedFileId = latest?.id ?? null;
    this.loadFile(this.selectedFileId);
  }

  setLevel(level: LogLevel): void {
    if (!this.selectedModule) return;
    this.moduleLevel = level;
    this.loggingService.setModuleLevel(this.selectedModule, level);
  }

  loadFile(fileId: string | null): void {
    this.selectedFileId = fileId;
    this.fileContent = fileId ? this.loggingService.getLogContent(fileId) : '';
  }

  deleteFile(fileId: string): void {
    if (!this.selectedModule) return;
    this.loggingService.deleteLogFile(this.selectedModule, fileId);
    this.loadModule(this.selectedModule);
  }

  clearModule(): void {
    if (!this.selectedModule) return;
    this.loggingService.clearModuleLogs(this.selectedModule);
    this.loadModule(this.selectedModule);
  }

  downloadFile(fileId: string): void {
    const content = this.loggingService.getLogContent(fileId);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileId}.log`;
    link.click();
    URL.revokeObjectURL(url);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
