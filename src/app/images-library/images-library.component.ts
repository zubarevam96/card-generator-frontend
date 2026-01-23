import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ImageAsset } from '../models/image-asset.model';
import { ImageLibraryService } from '../services/image-library.service';

@Component({
  selector: 'app-images-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './images-library.component.html',
  styleUrls: ['./images-library.component.css']
})
export class ImagesLibraryComponent {
  get images$() {
    return this.imageLibrary.images$;
  }
  isUploading = false;
  copiedId: number | null = null;

  constructor(private imageLibrary: ImageLibraryService) {}

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isUploading = true;
    try {
      await this.imageLibrary.addFiles(input.files);
    } catch (error) {
      console.error('Failed to add images', error);
    } finally {
      input.value = '';
      this.isUploading = false;
    }
  }

  deleteImage(id: number) {
    this.imageLibrary.deleteImage(id);
  }

  async copyUrl(image: ImageAsset) {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(image.dataUrl);
      this.copiedId = image.id;
      window.setTimeout(() => {
        if (this.copiedId === image.id) {
          this.copiedId = null;
        }
      }, 1500);
    } catch (error) {
      console.error('Failed to copy image url', error);
    }
  }
}
