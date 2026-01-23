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
  private readonly aliasRegex = /{alias_(\d+)_(text|img)}/g;

  private aliasSubject = new BehaviorSubject<Alias[]>([]);
  aliases$ = this.aliasSubject.asObservable();

  constructor() {
    this.loadAliases();
  }

  private loadAliases(): void {
    const stored = localStorage.getItem(this.storageKey);
    const legacy = localStorage.getItem(this.legacyStorageKey);
    const aliases: Alias[] = stored
      ? JSON.parse(stored)
      : legacy
        ? JSON.parse(legacy)
        : [];

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

  private saveAliases(): void {
    const aliases = this.aliasSubject.value;
    localStorage.setItem(this.storageKey, JSON.stringify(aliases));
  }

  addTextAlias(name: string, content: string): void {
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
  }

  addImageAlias(name: string, dataUrl: string, defaultSize: number = 16): void {
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

  getAliasReference(id: number): string {
    const alias = this.aliasSubject.value.find(al => al.id === id);
    if (!alias) return '';

    if (alias.type === 'text') {
      return alias.content;
    } else {
      return `<img src="${alias.dataUrl}" alt="${alias.name}" width="${alias.defaultSize}" height="${alias.defaultSize}" style="vertical-align:middle; display: inline">`;
    }
  }

  applyAliasesToHtml(html: string): string {
    if (!html) return html;

    const aliases = this.aliasSubject.value;
    if (!aliases.length) return html;

    return html.replace(this.aliasRegex, (match, idText: string, type: string) => {
      const id = Number(idText);
      const alias = aliases.find(al => al.id === id);
      if (!alias) return match;
      if (type === 'text' && alias.type !== 'text') return match;
      if (type === 'img' && alias.type !== 'image') return match;
      return this.getAliasReference(id);
    });
  }
}
