import { Injectable } from '@angular/core';

export type LogLevel = 'error' | 'info' | 'debug';

export interface LogFileMeta {
  id: string;
  createdAt: number;
  size: number;
}

interface LogModuleState {
  level: LogLevel;
  files: LogFileMeta[];
}

interface LogManifest {
  modules: Record<string, LogModuleState>;
}

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private readonly manifestKey = 'log-manifest-v1';
  private readonly fileKeyPrefix = 'logfile-v1:';
  private readonly maxFileSizeBytes = 10 * 1024 * 1024; // 10MB
  private readonly maxFilesPerModule = 10;
  private readonly defaultLevel: LogLevel = 'info';

  private readonly defaultModules = [
    'exporting',
    'canvas-block',
    'templates-block',
    'properties-block',
    'app'
  ];

  log(module: string, level: LogLevel, message: string, data?: unknown): void {
    try {
      const moduleLevel = this.getModuleLevel(module);
      if (!this.shouldLog(moduleLevel, level)) {
        return;
      }

      const entry = this.buildEntry(module, level, message, data);
      const entryText = `${JSON.stringify(entry)}\n`;
      const entrySize = this.byteSize(entryText);

      const manifest = this.getManifest();
      const moduleState = this.ensureModuleState(manifest, module);
      let targetFile = moduleState.files[moduleState.files.length - 1];

      if (!targetFile || targetFile.size + entrySize > this.maxFileSizeBytes) {
        targetFile = this.createNewFile(moduleState, module, manifest);
      }

      const fileKey = this.fileKey(targetFile.id);
      const existing = localStorage.getItem(fileKey) ?? '';
      const updated = existing + entryText;
      localStorage.setItem(fileKey, updated);
      targetFile.size = this.byteSize(updated);

      this.enforceFileLimit(moduleState, manifest);
      this.saveManifest(manifest);
    } catch {
      // swallow logging failures
    }
  }

  getModules(): string[] {
    const manifest = this.getManifest();
    const modules = new Set([...this.defaultModules, ...Object.keys(manifest.modules)]);
    return Array.from(modules.values());
  }

  getModuleLevel(module: string): LogLevel {
    const manifest = this.getManifest();
    const state = manifest.modules[module];
    if (state?.level) {
      return state.level;
    }
    return this.defaultLevel;
  }

  setModuleLevel(module: string, level: LogLevel): void {
    const manifest = this.getManifest();
    const state = this.ensureModuleState(manifest, module);
    state.level = level;
    this.saveManifest(manifest);
  }

  getLogFiles(module: string): LogFileMeta[] {
    const manifest = this.getManifest();
    const state = manifest.modules[module];
    return state?.files ?? [];
  }

  getLogContent(fileId: string): string {
    return localStorage.getItem(this.fileKey(fileId)) ?? '';
  }

  deleteLogFile(module: string, fileId: string): void {
    const manifest = this.getManifest();
    const state = manifest.modules[module];
    if (!state) return;

    state.files = state.files.filter(file => file.id !== fileId);
    localStorage.removeItem(this.fileKey(fileId));
    this.saveManifest(manifest);
  }

  clearModuleLogs(module: string): void {
    const manifest = this.getManifest();
    const state = manifest.modules[module];
    if (!state) return;

    for (const file of state.files) {
      localStorage.removeItem(this.fileKey(file.id));
    }
    state.files = [];
    this.saveManifest(manifest);
  }

  private buildEntry(module: string, level: LogLevel, message: string, data?: unknown) {
    return {
      timestamp: new Date().toISOString(),
      module,
      level,
      message,
      data: this.safeSerialize(data)
    };
  }

  private safeSerialize(data: unknown): unknown {
    if (data === undefined) return undefined;
    try {
      JSON.stringify(data);
      return data;
    } catch {
      return String(data);
    }
  }

  private shouldLog(moduleLevel: LogLevel, eventLevel: LogLevel): boolean {
    return this.levelRank(eventLevel) <= this.levelRank(moduleLevel);
  }

  private levelRank(level: LogLevel): number {
    switch (level) {
      case 'error':
        return 0;
      case 'info':
        return 1;
      case 'debug':
        return 2;
      default:
        return 1;
    }
  }

  private getManifest(): LogManifest {
    try {
      const raw = localStorage.getItem(this.manifestKey);
      if (!raw) {
        return { modules: {} };
      }
      const parsed = JSON.parse(raw) as LogManifest;
      if (!parsed.modules) {
        return { modules: {} };
      }
      return parsed;
    } catch {
      return { modules: {} };
    }
  }

  private saveManifest(manifest: LogManifest): void {
    localStorage.setItem(this.manifestKey, JSON.stringify(manifest));
  }

  private ensureModuleState(manifest: LogManifest, module: string): LogModuleState {
    if (!manifest.modules[module]) {
      manifest.modules[module] = {
        level: this.defaultLevel,
        files: []
      };
    }
    return manifest.modules[module];
  }

  private createNewFile(moduleState: LogModuleState, module: string, manifest: LogManifest): LogFileMeta {
    const id = `${module}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const meta: LogFileMeta = {
      id,
      createdAt: Date.now(),
      size: 0
    };
    moduleState.files.push(meta);
    localStorage.setItem(this.fileKey(id), '');
    this.enforceFileLimit(moduleState, manifest);
    return meta;
  }

  private enforceFileLimit(moduleState: LogModuleState, manifest: LogManifest): void {
    while (moduleState.files.length > this.maxFilesPerModule) {
      const removed = moduleState.files.shift();
      if (removed) {
        localStorage.removeItem(this.fileKey(removed.id));
      }
    }
    this.saveManifest(manifest);
  }

  private fileKey(id: string): string {
    return `${this.fileKeyPrefix}${id}`;
  }

  private byteSize(text: string): number {
    return new Blob([text]).size;
  }
}
