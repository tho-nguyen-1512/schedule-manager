import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { SchedulePage } from './schedule.page';

@NgModule({
  declarations: [SchedulePage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgGridModule,
    RouterModule.forChild([{ path: '', component: SchedulePage }]),
  ],
})
export class SchedulePageModule {}
