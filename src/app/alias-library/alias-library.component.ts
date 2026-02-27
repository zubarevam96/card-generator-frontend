import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  editingTextAliasId: number | null = null;
  activeTab: 'text' | 'image' = 'text';
  isEditModalOpen = false;

  textForm = {
    name: '',
    content: ''
  };

  editTextForm = {
    name: '',
    content: ''
  };

  aliases$;
  textAliases$;
  imageAliases$;
  hasTextAliases$;
  hasImageAliases$;

  constructor(
    private aliasService: AliasService,
    private sanitizer: DomSanitizer
  ) {
    this.aliases$ = this.aliasService.aliases$;
    this.textAliases$ = this.aliases$.pipe(map(list => list.filter(al => al.type === 'text')));
    this.imageAliases$ = this.aliases$.pipe(map(list => list.filter(al => al.type === 'image')));
    this.hasTextAliases$ = this.textAliases$.pipe(map(list => list.length > 0));
    this.hasImageAliases$ = this.imageAliases$.pipe(map(list => list.length > 0));
  }

  setActiveTab(tab: 'text' | 'image'): void {
    this.activeTab = tab;
    if (tab === 'image') {
      this.showTextForm = false;
      this.cancelEditTextAlias();
    }
  }

  addTextAlias(): void {
    const name = this.textForm.name.trim();
    const content = this.textForm.content.trim();
    if (!name || !content) {
      alert('Please fill in both name and content');
      return;
    }

    const added = this.aliasService.addTextAlias(name, content);
    if (!added) {
      alert('Alias name already exists. Please choose a unique name.');
      return;
    }
    this.textForm = { name: '', content: '' };
    this.showTextForm = false;
  }

  startEditTextAlias(alias: { id: number; name: string; content: string }): void {
    this.editingTextAliasId = alias.id;
    this.editTextForm = { name: alias.name, content: alias.content };
    this.isEditModalOpen = true;
  }

  cancelEditTextAlias(): void {
    this.editingTextAliasId = null;
    this.editTextForm = { name: '', content: '' };
    this.isEditModalOpen = false;
  }

  saveTextAlias(): void {
    if (this.editingTextAliasId === null) return;
    const name = this.editTextForm.name.trim();
    const content = this.editTextForm.content.trim();
    if (!name || !content) {
      alert('Please fill in both name and content');
      return;
    }

    const updated = this.aliasService.updateTextAlias(this.editingTextAliasId, name, content);
    if (!updated) {
      alert('Alias name already exists. Please choose a unique name.');
      return;
    }

    this.cancelEditTextAlias();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        const defaultName = file.name.replace(/\.[^/.]+$/, '');
        const chosen = prompt('Enter a name for this image alias:', defaultName);
        const name = (chosen ?? '').trim();
        if (!name) {
          return;
        }
        const added = this.aliasService.addImageAlias(name, dataUrl, 16);
        if (!added) {
          alert('Alias name already exists. Please rename the file or choose a different name.');
          return;
        }
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

  getAliasPreview(content: string): SafeHtml {
    const resolved = this.aliasService.applyDefaultValuesToContent(content);
    return this.sanitizer.bypassSecurityTrustHtml(resolved);
  }
}
