import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ImageAsset } from '../models/image-asset.model';

@Injectable({
  providedIn: 'root'
})
export class ImageLibraryService {
  private readonly storageKey = 'savedImages';
  private imagesSubject = new BehaviorSubject<ImageAsset[]>(this.loadFromStorage());
  images$ = this.imagesSubject.asObservable();

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
    this.persist(updated);
  }

  private addFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newImage: ImageAsset = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: file.name,
          dataUrl,
          createdAt: new Date().toISOString()
        };

        const updated = [...this.imagesSubject.value, newImage];
        this.imagesSubject.next(updated);
        this.persist(updated);
        resolve();
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private loadFromStorage(): ImageAsset[] {
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

  private persist(images: ImageAsset[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(images));
  }
}
