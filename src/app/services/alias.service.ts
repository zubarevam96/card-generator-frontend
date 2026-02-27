import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Alias, TextAlias, ImageAlias } from '../models/alias.model';

@Injectable({
  providedIn: 'root'
})
export class AliasService {
  private static nextAliasId = 1;
  private readonly storageKey = 'savedAliases';
  private readonly legacyStorageKey = 'savedCopypastas';
  private readonly aliasRegex = /(?<!{){([^{}]+)}(?!})/g;

  private aliasSubject = new BehaviorSubject<Alias[]>([]);
  aliases$ = this.aliasSubject.asObservable();

  constructor() {
    this.loadAliases();
  }

  private loadAliases(): void {
    const stored = localStorage.getItem(this.storageKey);
    const legacy = localStorage.getItem(this.legacyStorageKey);
    let parsed: any[] = [];
    try {
      parsed = stored
        ? (JSON.parse(stored) as any[])
        : legacy
          ? (JSON.parse(legacy) as any[])
          : [];
    } catch (error) {
      console.warn('Failed to parse saved aliases, starting fresh.', error);
      parsed = [];
    }

    const aliases: Alias[] = this.normalizeAliases(parsed);

    aliases.forEach(al => {
      if (al.id >= AliasService.nextAliasId) {
        AliasService.nextAliasId = al.id + 1;
      }
    });

    // If legacy data existed, migrate it to new storage key
    if (!stored && legacy) {
      localStorage.setItem(this.storageKey, JSON.stringify(aliases));
    }

    this.aliasSubject.next(aliases);
  }

  private normalizeAliases(raw: any[]): Alias[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .map(item => {
        const name = typeof item?.name === 'string' ? item.name : '';
        const id = typeof item?.id === 'number' ? item.id : AliasService.nextAliasId++;
        const createdAt = typeof item?.createdAt === 'number' ? item.createdAt : Date.now();
        const type: 'text' | 'image' = item?.type === 'image' || item?.dataUrl ? 'image' : 'text';

        if (type === 'image') {
          return {
            id,
            type: 'image',
            name,
            dataUrl: typeof item?.dataUrl === 'string' ? item.dataUrl : '',
            defaultSize: Number.isFinite(item?.defaultSize) ? Number(item.defaultSize) : 16,
            createdAt
          } as ImageAlias;
        }

        return {
          id,
          type: 'text',
          name,
          content: typeof item?.content === 'string' ? item.content : '',
          createdAt
        } as TextAlias;
      })
      .filter(al => !!al.name);
  }

  private saveAliases(): void {
    const aliases = this.aliasSubject.value;
    localStorage.setItem(this.storageKey, JSON.stringify(aliases));
  }

  addTextAlias(name: string, content: string): boolean {
    if (this.isDuplicateName(name)) {
      return false;
    }
    const aliases = this.aliasSubject.value;
    const newAlias: TextAlias = {
      id: AliasService.nextAliasId++,
      type: 'text',
      name,
      content,
      createdAt: Date.now()
    };
    aliases.push(newAlias);
    this.aliasSubject.next(aliases);
    this.saveAliases();
    return true;
  }

  updateTextAlias(id: number, name: string, content: string): boolean {
    const aliases = this.aliasSubject.value;
    const index = aliases.findIndex(al => al.id === id && al.type === 'text');
    if (index === -1) return false;

    if (this.isDuplicateName(name, id)) {
      return false;
    }

    const existing = aliases[index] as TextAlias;
    aliases[index] = { ...existing, name, content };
    this.aliasSubject.next(aliases);
    this.saveAliases();
    return true;
  }

  addImageAlias(name: string, dataUrl: string, defaultSize: number = 16): boolean {
    if (this.isDuplicateName(name)) {
      return false;
    }
    const aliases = this.aliasSubject.value;
    const newAlias: ImageAlias = {
      id: AliasService.nextAliasId++,
      type: 'image',
      name,
      dataUrl,
      defaultSize,
      createdAt: Date.now()
    };
    aliases.push(newAlias);
    this.aliasSubject.next(aliases);
    this.saveAliases();
    return true;
  }

  updateAlias(id: number, updates: Partial<Alias>): void {
    const aliases = this.aliasSubject.value;
    const index = aliases.findIndex(al => al.id === id);
    if (index === -1) return;

    const existing = aliases[index];

    if (existing.type === 'text') {
      const merged: TextAlias = { ...existing, ...(updates as Partial<TextAlias>) };
      aliases[index] = merged;
    } else {
      const merged: ImageAlias = { ...existing, ...(updates as Partial<ImageAlias>) };
      aliases[index] = merged;
    }

    this.aliasSubject.next(aliases);
    this.saveAliases();
  }

  deleteAlias(id: number): void {
    const aliases = this.aliasSubject.value.filter(al => al.id !== id);
    this.aliasSubject.next(aliases);
    this.saveAliases();
  }

  getAliasReference(name: string, args: string[] = []): string {
    const normalized = this.normalizeName(name);
    const alias = this.aliasSubject.value.find(al => this.normalizeName(al.name) === normalized);
    if (!alias) return '';

    if (alias.type === 'text') {
      return this.applyArgsToContent(alias.content, args);
    } else {
      const width = this.getArgOrDefault(args, 0, alias.defaultSize.toString());
      const height = this.getArgOrDefault(args, 1, alias.defaultSize.toString());
      return `<img src="${alias.dataUrl}" alt="${alias.name}" width="${width}" height="${height}" style="vertical-align:middle; display: inline">`;
    }
  }

  applyAliasesToHtml(html: string): string {
    if (!html) return html;

    const aliases = this.aliasSubject.value;
    if (!aliases.length) return html;

    return html.replace(this.aliasRegex, (match, nameText: string) => {
      const parsed = this.parseAliasCall(nameText);
      if (!parsed) return match;
      const alias = aliases.find(al => this.normalizeName(al.name) === parsed.name);
      if (!alias) return match;
      return this.getAliasReference(alias.name, parsed.args);
    });
  }

  private parseAliasCall(raw: string): { name: string; args: string[] } | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      return { name: this.normalizeName(trimmed), args: [] };
    }

    const name = this.normalizeName(trimmed.slice(0, colonIndex));
    const argText = trimmed.slice(colonIndex + 1);
    const args = argText.length ? argText.split(',') : [];
    return { name, args: args.map(arg => arg.trim()) };
  }

  private applyArgsToContent(content: string, args: string[]): string {
    if (!content) return content;
    let argIndex = 0;
    return content.replace(/\{([^{}]*)\}/g, (match, defaultValue: string) => {
      const arg = args[argIndex];
      argIndex += 1;
      return this.getArgOrDefault([arg ?? ''], 0, defaultValue);
    });
  }

  private getArgOrDefault(args: string[], index: number, fallback: string): string {
    const value = args[index];
    return value && value.trim() !== '' ? value.trim() : fallback;
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private isDuplicateName(name: string, excludeId?: number): boolean {
    const normalized = this.normalizeName(name);
    return this.aliasSubject.value.some(
      al => this.normalizeName(al.name) === normalized && al.id !== excludeId
    );
  }
}
