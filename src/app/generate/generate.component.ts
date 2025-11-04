import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertiesBlockComponent } from './components/properties-block/properties-block.component';
import { CanvasBlockComponent } from './components/canvas-block/canvas-block.component';
import { TemplatesBlockComponent } from './components/templates-block/templates-block.component';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule, PropertiesBlockComponent, CanvasBlockComponent, TemplatesBlockComponent],
  templateUrl: './generate.component.html',
  styleUrls: ['./generate.component.css']
})
export class GenerateComponent {}
