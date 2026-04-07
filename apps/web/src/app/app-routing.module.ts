import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then((m) => m.DashboardPageModule),
  },
  {
    path: 'members',
    loadChildren: () => import('./pages/members/members.module').then((m) => m.MembersPageModule),
  },
  {
    path: 'projects',
    loadChildren: () => import('./pages/projects/projects.module').then((m) => m.ProjectsPageModule),
  },
  {
    path: 'assignments',
    loadChildren: () => import('./pages/assignments/assignments.module').then((m) => m.AssignmentsPageModule),
  },
  {
    path: 'schedule',
    loadChildren: () => import('./pages/schedule/schedule.module').then((m) => m.SchedulePageModule),
  },
  {
    path: 'reports',
    loadChildren: () => import('./pages/reports/reports.module').then((m) => m.ReportsPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
