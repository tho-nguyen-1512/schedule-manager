import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AssignmentsPage } from './assignments.page';

@NgModule({
  declarations: [AssignmentsPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([{ path: '', component: AssignmentsPage }]),
  ],
})
export class AssignmentsPageModule {}
