import { Routes } from '@angular/router';
import { GenerateComponent } from './generate/generate.component';

export const routes: Routes = [
  { path: '', redirectTo: 'generate', pathMatch: 'full' }, // redirects root "/"
  { path: 'generate', component: GenerateComponent },
  { path: '**', redirectTo: 'generate' } // fallback route
];
