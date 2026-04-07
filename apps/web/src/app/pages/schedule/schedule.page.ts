import { Component, OnInit, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ToastController, AlertController, IonModal } from '@ionic/angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  CellStyle,
  ICellEditorParams,
} from 'ag-grid-community';
import { ApiService, Task, Member, Project } from '../../services/api.service';
import {
  computeTaskIsDelayed,
  deriveStatusFromProgress,
  todayIsoLocal,
} from '../../services/task-reconcile.util';

type GanttBarTone = 'done' | 'delayed' | 'default';

interface GanttRow {
  projectName: string;
  memberName: string;
  taskTitle: string;
  days: boolean[];
  barTone: GanttBarTone;
}

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.page.html',
  styleUrls: ['./schedule.page.scss'],
  standalone: false,
})
export class SchedulePage implements OnInit {
  @ViewChild('addModal') addModal!: IonModal;

  tasks: Task[] = [];
  members: Member[] = [];
  projects: Project[] = [];
  private gridApi!: GridApi;

  filterMemberId = '';
  filterProjectId = '';
  filterStatus = '';
  filterMonth = '';

  /** Task Timeline (month Gantt): multi-select members/projects; empty = all. */
  timelineMemberIds: string[] = [];
  timelineProjectIds: string[] = [];
  timelineMonth = '';
  ganttDayHeaders: number[] = [];
  ganttRows: GanttRow[] = [];

  newTask: Partial<Task> = {};
  newSubProjects: { id: string; name: string }[] = [];

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
  };

  getRowId = (params: any) => params.data.id;
  getRowClass = (params: any) => {
    const d = params.data;
    if (!d) return '';
    return (!d.projectId || !d.subProjectId || !d.memberId) ? 'row-missing-field' : '';
  };

  constructor(
    private api: ApiService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.api.getMembers().subscribe((m) => {
      this.members = m;
      this.api.getProjects().subscribe((p) => {
        this.projects = p;
        this.buildColumns();
        this.loadTasks();
        const now = new Date();
        this.timelineMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.loadTimeline();
      });
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  private fmtDate(val: string): string {
    if (!val) return '—';
    const parts = val.split('-');
    if (parts.length !== 3) return val;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private missingHtml(label: string): string {
    return `<span style="color:#98a2b3;font-style:italic">— missing</span> <span style="color:#eb445a;font-weight:700;font-size:16px" title="${label} required">*</span>`;
  }

  private buildColumns() {
    const memberMap = Object.fromEntries(this.members.map((m) => [m.id, m.name]));
    const projectMap = Object.fromEntries(this.projects.map((p) => [p.id, p.name]));
    const subMap: Record<string, string> = {};
    this.projects.forEach((p) => p.subProjects.forEach((s) => (subMap[s.id] = s.name)));

    this.columnDefs = [
      {
        field: 'projectId',
        headerName: 'Project',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: this.projects.map((p) => p.id) },
        valueFormatter: (p) => (p.value ? projectMap[p.value as string] ?? p.value : ''),
        cellRenderer: (p: any) => {
          if (!p.value) return this.missingHtml('Project');
          return projectMap[p.value] ?? p.value;
        },
        minWidth: 140,
        pinned: 'left',
      },
      {
        field: 'subProjectId',
        headerName: 'Sub-Project',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: (params: ICellEditorParams<Task, string>) => {
          const pid = params.data?.projectId as string | undefined;
          if (!pid) {
            return { values: [] as string[] };
          }
          const proj = this.projects.find((p) => p.id === pid);
          const values = (proj?.subProjects ?? []).map((s) => s.id);
          return { values };
        },
        valueFormatter: (p) => (p.value ? subMap[p.value as string] ?? p.value : ''),
        cellRenderer: (p: any) => {
          if (!p.value) return this.missingHtml('Sub-project');
          return subMap[p.value] ?? p.value;
        },
        minWidth: 150,
      },
      { field: 'title', headerName: 'Task Title', editable: true, minWidth: 200 },
      {
        field: 'memberId',
        headerName: 'Member',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: this.members.map((m) => m.id) },
        valueFormatter: (p) => (p.value ? memberMap[p.value as string] ?? p.value : ''),
        cellRenderer: (p: any) => {
          if (!p.value) return this.missingHtml('Member');
          return memberMap[p.value] ?? p.value;
        },
        minWidth: 130,
      },
      {
        field: 'progressPercent',
        headerName: 'Progress',
        editable: true,
        type: 'numericColumn',
        minWidth: 100,
        valueFormatter: (p) => (p.value != null ? `${p.value}%` : ''),
        cellStyle: (params): CellStyle | undefined => {
          const v = params.value as number;
          if (v >= 100) return { color: '#2dd36f', fontWeight: '600' };
          if (v >= 50) return { color: '#3dc2ff', fontWeight: '600' };
          return undefined;
        },
      },
      { field: 'startDate', headerName: 'Start Date', editable: true, minWidth: 120, valueFormatter: (p) => this.fmtDate(p.value) },
      { field: 'durationDays', headerName: 'Duration', editable: false, minWidth: 95 },
      { field: 'endDate', headerName: 'End Date', editable: true, minWidth: 120, valueFormatter: (p) => this.fmtDate(p.value) },
      {
        field: 'status',
        headerName: 'Status',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['TODO', 'IN_PROGRESS', 'DONE'] },
        minWidth: 120,
        cellStyle: (params): CellStyle | undefined => {
          switch (params.value) {
            case 'DONE': return { color: '#2dd36f', fontWeight: '600' };
            case 'IN_PROGRESS': return { color: '#3dc2ff', fontWeight: '600' };
            case 'TODO': return { color: '#92949c' };
            default: return undefined;
          }
        },
      },
      {
        field: 'priority',
        headerName: 'Priority',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['LOW', 'MEDIUM', 'HIGH'] },
        minWidth: 95,
        cellStyle: (params): CellStyle | undefined => {
          switch (params.value) {
            case 'HIGH': return { color: '#eb445a', fontWeight: '600' };
            case 'MEDIUM': return { color: '#ffc409', fontWeight: '600' };
            case 'LOW': return { color: '#92949c' };
            default: return undefined;
          }
        },
      },
      { field: 'comments', headerName: 'Comment', editable: true, minWidth: 150 },
      {
        headerName: 'Delay',
        editable: false,
        minWidth: 80,
        valueGetter: (params) => {
          const t = params.data as Task;
          if (!t) return '';
          if (t.isDelayed != null) return t.isDelayed ? 'Yes' : 'No';
          return computeTaskIsDelayed(t, todayIsoLocal()) ? 'Yes' : 'No';
        },
        cellStyle: (params): CellStyle =>
          params.value === 'Yes'
            ? { color: '#fff', backgroundColor: '#eb445a', fontWeight: '700', textAlign: 'center' }
            : { color: '#2dd36f', textAlign: 'center' },
      },
      {
        headerName: '',
        width: 70,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: () =>
          '<button class="ag-action-btn delete-btn" style="padding:2px 8px;font-size:11px">Delete</button>',
        onCellClicked: (params) => {
          const target = params.event?.target as HTMLElement;
          if (target?.classList.contains('delete-btn')) {
            this.confirmDeleteTask(params.data);
          }
        },
      },
    ];
  }

  loadTasks() {
    const query: any = {};
    if (this.filterMemberId) query.memberId = this.filterMemberId;
    if (this.filterProjectId) query.projectId = this.filterProjectId;
    if (this.filterStatus) query.status = this.filterStatus;
    if (this.filterMonth) query.month = this.filterMonth;
    this.api.getTasks(query).subscribe((t) => {
      this.tasks = t;
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', t);
      }
    });
  }

  onCellValueChanged(event: CellValueChangedEvent) {
    const task = event.data as Task;
    const field = event.colDef.field!;
    const patch: Record<string, unknown> =
      field === 'progressPercent'
        ? { progressPercent: Number(event.newValue) }
        : { [field]: event.newValue };

    if (field === 'progressPercent') {
      const merged = { ...task, ...patch } as Task;
      merged.progressPercent = Number(merged.progressPercent);
      const derived = deriveStatusFromProgress(merged, todayIsoLocal());
      if (derived.status !== task.status) {
        patch['status'] = derived.status;
      }
      const currCompletion = task.completionDate ?? null;
      if (derived.completionDate !== currCompletion) {
        patch['completionDate'] = derived.completionDate;
      }
    }

    this.api.updateTask(task.id, patch as Partial<Task>).subscribe({
      next: (updated) => {
        const row: Task = {
          ...updated,
          isDelayed: computeTaskIsDelayed(updated, todayIsoLocal()),
        };
        const idx = this.tasks.findIndex((t) => t.id === row.id);
        if (idx >= 0) this.tasks[idx] = row;
        this.gridApi.applyTransaction({ update: [row] });
        this.loadTimeline();
      },
      error: (err) => {
        this.showToast(err?.error?.error?.message || 'Update failed', 'danger');
        this.loadTasks();
        this.loadTimeline();
      },
    });
  }

  openAdd() {
    this.newTask = {
      status: 'TODO',
      priority: 'MEDIUM',
      progressPercent: 0,
    };
    this.newSubProjects = [];
    this.addModal.present();
  }

  onNewProjectChange() {
    const proj = this.projects.find((p) => p.id === this.newTask.projectId);
    this.newSubProjects = proj?.subProjects ?? [];
    if (this.newSubProjects.length === 1) {
      this.newTask.subProjectId = this.newSubProjects[0].id;
    } else {
      this.newTask.subProjectId = undefined;
    }
  }

  async saveNewTask() {
    try {
      const payload = { ...this.newTask } as Partial<Task>;
      if (payload.progressPercent != null) {
        const derived = deriveStatusFromProgress(
          {
            progressPercent: Number(payload.progressPercent),
            completionDate: payload.completionDate ?? null,
          },
          todayIsoLocal()
        );
        payload.status = derived.status;
        payload.completionDate = derived.completionDate ?? undefined;
      }
      await this.api.createTask(payload).toPromise();
      this.addModal.dismiss();
      this.api.getProjects().subscribe((p) => {
        this.projects = p;
        this.buildColumns();
        this.loadTasks();
        this.loadTimeline();
      });
      this.showToast('Task created');
    } catch (err: any) {
      this.showToast(err?.error?.error?.message || 'Error', 'danger');
    }
  }

  async confirmDeleteTask(task: Task) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Task',
      message: `Delete "${task.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.api.deleteTask(task.id).subscribe(() => {
              this.loadTasks();
              this.loadTimeline();
              this.showToast('Task deleted');
            });
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'top' });
    await toast.present();
  }

  /** Empty selection means “all” for timeline filters. */
  private timelineEffectiveMemberIds(): string[] {
    if (this.timelineMemberIds.length === 0) {
      return this.members.map((m) => m.id);
    }
    return [...new Set(this.timelineMemberIds)];
  }

  private timelineEffectiveProjectIds(): Set<string> {
    if (this.timelineProjectIds.length === 0) {
      return new Set(this.projects.map((p) => p.id));
    }
    return new Set(this.timelineProjectIds);
  }

  loadTimeline() {
    if (!this.timelineMonth) {
      this.ganttRows = [];
      this.ganttDayHeaders = [];
      return;
    }

    const memberIds = this.timelineEffectiveMemberIds();
    const projectSet = this.timelineEffectiveProjectIds();

    if (memberIds.length === 0) {
      this.ganttRows = [];
      this.ganttDayHeaders = [];
      return;
    }

    const [year, month] = this.timelineMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    this.ganttDayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth);

    const projectMap = new Map(this.projects.map((p) => [p.id, p.name]));
    const memberMap = new Map(this.members.map((m) => [m.id, m.name]));

    forkJoin(memberIds.map((id) => this.api.getTasks({ memberId: id }))).subscribe((taskLists) => {
      const byId = new Map<string, Task>();
      for (const list of taskLists) {
        for (const t of list) {
          byId.set(t.id, t);
        }
      }

      const filtered = Array.from(byId.values()).filter((t) => {
        if (!t.startDate) return false;
        if (!t.projectId || !projectSet.has(t.projectId)) return false;
        const start = this.parseTimelineDate(t.startDate);
        const end = t.endDate ? this.parseTimelineDate(t.endDate) : start;
        return start <= monthEnd && end >= monthStart;
      });

      filtered.sort((a, b) => {
        const pa = projectMap.get(a.projectId!) || '';
        const pb = projectMap.get(b.projectId!) || '';
        if (pa !== pb) return pa.localeCompare(pb);
        const ma = memberMap.get(a.memberId!) || '';
        const mb = memberMap.get(b.memberId!) || '';
        if (ma !== mb) return ma.localeCompare(mb);
        return a.title.localeCompare(b.title);
      });

      const today = todayIsoLocal();

      this.ganttRows = filtered.map((t) => {
        const start = this.parseTimelineDate(t.startDate);
        const end = t.endDate ? this.parseTimelineDate(t.endDate) : start;

        const days = this.ganttDayHeaders.map((d) => {
          const current = new Date(year, month - 1, d);
          return current >= start && current <= end;
        });

        const barTone = this.timelineBarTone(t, today);

        return {
          projectName: projectMap.get(t.projectId!) || '—',
          memberName: memberMap.get(t.memberId!) || '—',
          taskTitle: t.title,
          days,
          barTone,
        };
      });
    });
  }

  private parseTimelineDate(dateStr: string): Date {
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  private timelineBarTone(task: Task, todayIso: string): GanttBarTone {
    const p = Number(task.progressPercent);
    if (task.status === 'DONE' || (Number.isFinite(p) && p >= 100)) {
      return 'done';
    }
    if (computeTaskIsDelayed(task, todayIso)) {
      return 'delayed';
    }
    return 'default';
  }
}
