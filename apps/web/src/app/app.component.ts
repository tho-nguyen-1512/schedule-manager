import { Component } from '@angular/core';

const MENU_COLLAPSED_KEY = 'appMenuCollapsed';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  /** Narrow icon-only rail; persisted in localStorage. */
  menuCollapsed = false;

  menuItems = [
    { title: 'Dashboard', url: '/dashboard', icon: 'speedometer-outline' },
    { title: 'Schedule', url: '/schedule', icon: 'calendar-outline' },
    { title: 'Projects', url: '/projects', icon: 'folder-outline' },
    { title: 'Members', url: '/members', icon: 'people-outline' },
    { title: 'Reports', url: '/reports', icon: 'download-outline' },
  ];

  constructor() {
    try {
      if (localStorage.getItem(MENU_COLLAPSED_KEY) === '1') {
        this.menuCollapsed = true;
      }
    } catch {
      /* ignore */
    }
  }

  toggleMenuRail() {
    this.menuCollapsed = !this.menuCollapsed;
    try {
      localStorage.setItem(MENU_COLLAPSED_KEY, this.menuCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
}
