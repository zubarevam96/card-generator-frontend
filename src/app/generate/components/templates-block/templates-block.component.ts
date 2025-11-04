import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-templates-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-block.component.html',
  styleUrls: ['./templates-block.component.css']
})
export class TemplatesBlockComponent {
  showTemplates = true;

  toggle() {
    this.showTemplates = !this.showTemplates;
  }
}
