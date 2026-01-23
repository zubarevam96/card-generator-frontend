import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Copypasta, TextCopypasta, ImageCopypasta } from '../models/copypasta.model';

@Injectable({
  providedIn: 'root'
})
export class CopypastaService {
  private static nextCopypastaId = 1;
  private readonly storageKey = 'savedCopypastas';

  private copypastaSubject = new BehaviorSubject<Copypasta[]>([]);
  copypastas$ = this.copypastaSubject.asObservable();

  constructor() {
    this.loadCopypastas();
  }

  private loadCopypastas(): void {
    const stored = localStorage.getItem(this.storageKey);
    const copypastas: Copypasta[] = stored ? JSON.parse(stored) : [];
    
    // Update nextCopypastaId to be ahead of any loaded IDs
    copypastas.forEach(cp => {
      if (cp.id >= CopypastaService.nextCopypastaId) {
        CopypastaService.nextCopypastaId = cp.id + 1;
      }
    });

    this.copypastaSubject.next(copypastas);
  }

  private saveCopypastas(): void {
    const copypastas = this.copypastaSubject.value;
    localStorage.setItem(this.storageKey, JSON.stringify(copypastas));
  }

  addTextCopypasta(name: string, content: string): void {
    const copypastas = this.copypastaSubject.value;
    const newCopypasta: TextCopypasta = {
      id: CopypastaService.nextCopypastaId++,
      type: 'text',
      name,
      content,
      createdAt: Date.now()
    };
    copypastas.push(newCopypasta);
    this.copypastaSubject.next(copypastas);
    this.saveCopypastas();
  }

  addImageCopypasta(name: string, dataUrl: string, defaultSize: number = 16): void {
    const copypastas = this.copypastaSubject.value;
    const newCopypasta: ImageCopypasta = {
      id: CopypastaService.nextCopypastaId++,
      type: 'image',
      name,
      dataUrl,
      defaultSize,
      createdAt: Date.now()
    };
    copypastas.push(newCopypasta);
    this.copypastaSubject.next(copypastas);
    this.saveCopypastas();
  }

  updateCopypasta(id: number, updates: Partial<Copypasta>): void {
    const copypastas = this.copypastaSubject.value;
    const index = copypastas.findIndex(cp => cp.id === id);
    if (index === -1) return;

    const existing = copypastas[index];

    if (existing.type === 'text') {
      const merged: TextCopypasta = { ...existing, ...(updates as Partial<TextCopypasta>) };
      copypastas[index] = merged;
    } else {
      const merged: ImageCopypasta = { ...existing, ...(updates as Partial<ImageCopypasta>) };
      copypastas[index] = merged;
    }

    this.copypastaSubject.next(copypastas);
    this.saveCopypastas();
  }

  deleteCopypasta(id: number): void {
    const copypastas = this.copypastaSubject.value.filter(cp => cp.id !== id);
    this.copypastaSubject.next(copypastas);
    this.saveCopypastas();
  }

  getCopypastaReference(id: number): string {
    const copypasta = this.copypastaSubject.value.find(cp => cp.id === id);
    if (!copypasta) return '';
    
    if (copypasta.type === 'text') {
      return copypasta.content;
    } else {
      // For images, return HTML img tag with reference
      return `<img src="${copypasta.dataUrl}" alt="${copypasta.name}" width="${copypasta.defaultSize}" height="${copypasta.defaultSize}" style="vertical-align:middle; display: inline">`;
    }
  }
}
