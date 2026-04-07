import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  LinearScale,
  Tooltip,
  Legend
);
ModuleRegistry.registerModules([AllCommunityModule]);

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
