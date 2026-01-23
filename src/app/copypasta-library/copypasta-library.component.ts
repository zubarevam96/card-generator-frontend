import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CopypastaService } from '../services/copypasta.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-copypasta-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './copypasta-library.component.html',
  styleUrls: ['./copypasta-library.component.css']
})
export class CopypastaLibraryComponent {
  showTextForm = false;

  textForm = {
    name: '',
    content: ''
  };

  get copypastas$() {
    return this.copypastaService.copypastas$;
  }

  textCopypastas$ = this.copypastas$.pipe(
    map(cpList => cpList.filter(cp => cp.type === 'text'))
  );

  imageCopypastas$ = this.copypastas$.pipe(
    map(cpList => cpList.filter(cp => cp.type === 'image'))
  );

  hasTextCopypastas$ = this.textCopypastas$.pipe(map(list => list.length > 0));

  hasImageCopypastas$ = this.imageCopypastas$.pipe(map(list => list.length > 0));

  constructor(private copypastaService: CopypastaService) {}

  addTextCopypasta(): void {
    if (!this.textForm.name.trim() || !this.textForm.content.trim()) {
      alert('Please fill in both name and content');
      return;
    }

    this.copypastaService.addTextCopypasta(this.textForm.name, this.textForm.content);
    this.textForm = { name: '', content: '' };
    this.showTextForm = false;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        this.copypastaService.addImageCopypasta(name, dataUrl, 16);
      }
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  deleteCopypasta(id: number): void {
    if (confirm('Are you sure you want to delete this copypasta?')) {
      this.copypastaService.deleteCopypasta(id);
    }
  }

  updateImageSize(id: number, newSize: number): void {
    this.copypastaService.updateCopypasta(id, { defaultSize: newSize });
  }
}
