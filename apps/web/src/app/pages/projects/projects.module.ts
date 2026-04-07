import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ProjectsPage } from './projects.page';

@NgModule({
  declarations: [ProjectsPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgGridModule,
    RouterModule.forChild([{ path: '', component: ProjectsPage }]),
  ],
})
export class ProjectsPageModule {}
