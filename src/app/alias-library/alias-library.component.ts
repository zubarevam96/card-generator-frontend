import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AliasService } from '../services/alias.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-alias-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alias-library.component.html',
  styleUrls: ['./alias-library.component.css']
})
export class AliasLibraryComponent {
  showTextForm = false;

  textForm = {
    name: '',
    content: ''
  };

  aliases$;
  textAliases$;
  imageAliases$;
  hasTextAliases$;
  hasImageAliases$;

  constructor(private aliasService: AliasService) {
    this.aliases$ = this.aliasService.aliases$;
    this.textAliases$ = this.aliases$.pipe(map(list => list.filter(al => al.type === 'text')));
    this.imageAliases$ = this.aliases$.pipe(map(list => list.filter(al => al.type === 'image')));
    this.hasTextAliases$ = this.textAliases$.pipe(map(list => list.length > 0));
    this.hasImageAliases$ = this.imageAliases$.pipe(map(list => list.length > 0));
  }

  addTextAlias(): void {
    if (!this.textForm.name.trim() || !this.textForm.content.trim()) {
      alert('Please fill in both name and content');
      return;
    }

    this.aliasService.addTextAlias(this.textForm.name, this.textForm.content);
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
        const name = file.name.replace(/\.[^/.]+$/, '');
        this.aliasService.addImageAlias(name, dataUrl, 16);
      }
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  deleteAlias(id: number): void {
    if (confirm('Are you sure you want to delete this alias?')) {
      this.aliasService.deleteAlias(id);
    }
  }

  updateImageSize(id: number, newSize: number): void {
    this.aliasService.updateAlias(id, { defaultSize: newSize });
  }
}
