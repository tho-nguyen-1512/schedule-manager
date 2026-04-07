import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { MembersPage } from './members.page';

@NgModule({
  declarations: [MembersPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgGridModule,
    RouterModule.forChild([{ path: '', component: MembersPage }]),
  ],
})
export class MembersPageModule {}
