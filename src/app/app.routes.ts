import { Routes } from '@angular/router';
import { GenerateComponent } from './generate/generate.component';
import { ImagesLibraryComponent } from './images-library/images-library.component';

export const routes: Routes = [
  { path: '', redirectTo: 'generate', pathMatch: 'full' }, // redirects root "/"
  { path: 'generate', component: GenerateComponent },
  { path: 'images', component: ImagesLibraryComponent },
  { path: '**', redirectTo: 'generate' } // fallback route
];
