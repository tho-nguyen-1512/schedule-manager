import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardPage } from './dashboard.page';

@NgModule({
  declarations: [DashboardPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BaseChartDirective,
    RouterModule.forChild([{ path: '', component: DashboardPage }]),
  ],
})
export class DashboardPageModule {}
