import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ImageAsset } from '../models/image-asset.model';

@Injectable({
  providedIn: 'root'
})
export class ImageLibraryService {
  private readonly storageKey = 'savedImages';
  private readonly dbName = 'cardGeneratorDb';
  private readonly storeName = 'images';
  private imagesSubject = new BehaviorSubject<ImageAsset[]>([]);
  images$ = this.imagesSubject.asObservable();

  constructor() {
    void this.initializeImages();
  }

  getImages(): ImageAsset[] {
    return this.imagesSubject.value;
  }

  async addFiles(files: FileList | File[]): Promise<void> {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    await Promise.all(fileArray.map(file => this.addFile(file)));
  }

  deleteImage(id: number) {
    const updated = this.imagesSubject.value.filter(img => img.id !== id);
    this.imagesSubject.next(updated);
    void this.persist(updated);
  }

  private addFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const newImage: ImageAsset = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: file.name,
          dataUrl,
          createdAt: new Date().toISOString()
        };

        const updated = [...this.imagesSubject.value, newImage];
        this.imagesSubject.next(updated);
        try {
          await this.persist(updated);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private async initializeImages(): Promise<void> {
    const images = await this.loadFromStorage();
    this.imagesSubject.next(images);
  }

  private async loadFromStorage(): Promise<ImageAsset[]> {
    if (this.isIndexedDbAvailable()) {
      try {
        const fromDb = await this.loadFromIndexedDb();
        if (fromDb.length > 0) return fromDb;

        const legacy = this.loadFromLocalStorage();
        if (legacy.length > 0) {
          await this.persistToIndexedDb(legacy);
          this.clearLocalStorage();
        }
        return legacy;
      } catch (error) {
        console.error('Failed to load images from IndexedDB', error);
      }
    }

    return this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): ImageAsset[] {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as ImageAsset[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse saved images', e);
      return [];
    }
  }

  private clearLocalStorage() {
    localStorage.removeItem(this.storageKey);
  }

  private async persist(images: ImageAsset[]): Promise<void> {
    if (this.isIndexedDbAvailable()) {
      try {
        await this.persistToIndexedDb(images);
        return;
      } catch (error) {
        console.error('Failed to save images to IndexedDB', error);
      }
    }

    this.persistToLocalStorage(images);
  }

  private persistToLocalStorage(images: ImageAsset[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(images));
    } catch (error) {
      console.error('Failed to save images to localStorage', error);
    }
  }

  private isIndexedDbAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private loadFromIndexedDb(): Promise<ImageAsset[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openDb();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as ImageAsset[]) ?? []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  private persistToIndexedDb(images: ImageAsset[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => {
          images.forEach(image => store.put(image));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      } catch (error) {
        reject(error);
      }
    });
  }
}
