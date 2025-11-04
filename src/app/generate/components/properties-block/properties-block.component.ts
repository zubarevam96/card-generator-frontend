import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-properties-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './properties-block.component.html',
  styleUrls: ['./properties-block.component.css']
})
export class PropertiesBlockComponent {
  showDetails = true;

  toggle() {
    this.showDetails = !this.showDetails;
  }
}
