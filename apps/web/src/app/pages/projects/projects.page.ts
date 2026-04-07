import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonModal, ToastController } from '@ionic/angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { ApiService, Project, Member, SubProject } from '../../services/api.service';
import { forkJoin, of } from 'rxjs';

interface SubProjectEntry {
  id?: string;
  name: string;
}

interface ProjectForm {
  name: string;
  subProjects: SubProjectEntry[];
  emails: string[];
  resources: string[];
  documents: string[];
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone: false,
})
export class ProjectsPage implements OnInit {
  projects: Project[] = [];
  members: Member[] = [];
  private gridApi!: GridApi;
  @ViewChild('formModal') formModal!: IonModal;

  isEditing = false;
  editId = '';
  editSubProjects: SubProject[] = [];
  form: ProjectForm = { name: '', subProjects: [], emails: [], resources: [], documents: [] };

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
  };
  getRowId = (params: any) => params.data.id;

  constructor(
    private api: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.load();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  load() {
    this.api.getMembers().subscribe((m) => {
      this.members = m;
      this.api.getProjects().subscribe((p) => {
        this.projects = p;
        this.buildColumns();
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', p);
        }
      });
    });
  }

  private multiLinkRenderer(params: any) {
    const arr: string[] = params.value;
    if (!arr || arr.length === 0) return '—';
    return arr
      .map((v) => {
        if (v.includes('@')) {
          return `<a href="mailto:${v}" style="color:#3880ff;text-decoration:none">${v}</a>`;
        }
        const label = v.length > 35 ? v.substring(0, 35) + '…' : v;
        return `<a href="${v}" target="_blank" rel="noopener" style="color:#3880ff;text-decoration:none">${label}</a>`;
      })
      .join('<br>');
  }

  private buildColumns() {
    this.columnDefs = [
      {
        field: 'name',
        headerName: 'Project Name',
        minWidth: 180,
        pinned: 'left',
        cellStyle: { fontWeight: '600' },
      },
      {
        headerName: 'Sub-Projects',
        minWidth: 160,
        valueGetter: (params) => {
          const p = params.data as Project;
          if (!p) return '';
          return p.subProjects.map((s) => s.name).join('\n') || '—';
        },
        autoHeight: true,
        cellClass: 'multiline-cell',
      },
      {
        headerName: 'Core Member',
        minWidth: 150,
        valueGetter: (params) => {
          const p = params.data as Project;
          if (!p) return '';
          const names = this.members
            .filter((m) => m.coreProjectIds?.includes(p.id))
            .map((m) => m.name);
          return names.length > 0 ? names.join('\n') : '—';
        },
        autoHeight: true,
        cellClass: 'multiline-cell',
      },
      {
        headerName: 'Backup Member',
        minWidth: 150,
        valueGetter: (params) => {
          const p = params.data as Project;
          if (!p) return '';
          const names = this.members
            .filter((m) => m.supProjectIds?.includes(p.id))
            .map((m) => m.name);
          return names.length > 0 ? names.join('\n') : '—';
        },
        autoHeight: true,
        cellClass: 'multiline-cell',
      },
      {
        field: 'emails',
        headerName: 'Email',
        minWidth: 200,
        cellRenderer: this.multiLinkRenderer,
        autoHeight: true,
      },
      {
        field: 'resources',
        headerName: 'Resource',
        minWidth: 200,
        cellRenderer: this.multiLinkRenderer,
        autoHeight: true,
      },
      {
        field: 'documents',
        headerName: 'Document',
        minWidth: 200,
        cellRenderer: this.multiLinkRenderer,
        autoHeight: true,
      },
      {
        headerName: 'Actions',
        minWidth: 160,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: () =>
          `<div style="display:flex;gap:6px;align-items:center;height:100%">
            <button class="ag-action-btn edit-btn">Edit</button>
            <button class="ag-action-btn delete-btn">Delete</button>
          </div>`,
        onCellClicked: (params) => {
          const target = params.event?.target as HTMLElement;
          if (!target) return;
          if (target.classList.contains('edit-btn')) {
            this.openEdit(params.data);
          } else if (target.classList.contains('delete-btn')) {
            this.deleteProject(params.data);
          }
        },
      },
    ];
  }

  openCreate() {
    this.isEditing = false;
    this.editId = '';
    this.editSubProjects = [];
    this.form = { name: '', subProjects: [{ name: '' }], emails: [''], resources: [''], documents: [''] };
    this.formModal.present();
  }

  openEdit(project: Project) {
    this.isEditing = true;
    this.editId = project.id;
    this.editSubProjects = project.subProjects || [];
    this.form = {
      name: project.name,
      subProjects: project.subProjects?.length
        ? project.subProjects.map((s) => ({ id: s.id, name: s.name }))
        : [{ name: '' }],
      emails: project.emails?.length ? [...project.emails] : [''],
      resources: project.resources?.length ? [...project.resources] : [''],
      documents: project.documents?.length ? [...project.documents] : [''],
    };
    this.formModal.present();
  }

  addField(field: 'emails' | 'resources' | 'documents') {
    this.form[field].push('');
  }

  removeField(field: 'emails' | 'resources' | 'documents', index: number) {
    if (this.form[field].length > 1) {
      this.form[field].splice(index, 1);
    } else {
      this.form[field][0] = '';
    }
  }

  addSubField() {
    this.form.subProjects.push({ name: '' });
  }

  removeSubField(index: number) {
    if (this.form.subProjects.length > 1) {
      this.form.subProjects.splice(index, 1);
    } else {
      this.form.subProjects[0] = { name: '' };
    }
  }

  trackByIdx(index: number) {
    return index;
  }

  async save() {
    try {
      const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);
      const payload = {
        name: this.form.name?.trim(),
        emails: clean(this.form.emails),
        resources: clean(this.form.resources),
        documents: clean(this.form.documents),
      };
      if (!payload.name) return;

      if (this.isEditing) {
        await this.api.updateProject(this.editId, payload).toPromise();
        await this.syncSubProjects(this.editId);
      } else {
        const created = await this.api.createProject(payload).toPromise();
        if (created) {
          await this.syncSubProjects(created.id);
        }
      }
      this.formModal.dismiss();
      this.load();
      this.showToast(this.isEditing ? 'Project updated' : 'Project created');
    } catch (err: any) {
      this.showToast(err?.error?.error?.message || 'Error', 'danger');
    }
  }

  private async syncSubProjects(projectId: string) {
    const formSubs = this.form.subProjects
      .map((s) => ({ ...s, name: s.name.trim() }))
      .filter((s) => s.name);

    const existingIds = new Set(this.editSubProjects.map((s) => s.id));
    const formIds = new Set(formSubs.filter((s) => s.id).map((s) => s.id));

    const toDelete = this.editSubProjects.filter((s) => !formIds.has(s.id));
    const toCreate = formSubs.filter((s) => !s.id);
    const toUpdate = formSubs.filter(
      (s) => s.id && existingIds.has(s.id) &&
        this.editSubProjects.find((e) => e.id === s.id)?.name !== s.name
    );

    const ops = [
      ...toDelete.map((s) => this.api.deleteSubProject(s.id)),
      ...toCreate.map((s) => this.api.createSubProject(projectId, { name: s.name })),
      ...toUpdate.map((s) => this.api.updateSubProject(s.id!, { name: s.name })),
    ];

    if (ops.length > 0) {
      await forkJoin(ops).toPromise();
    }
  }

  async deleteProject(project: Project) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Project',
      message: `Delete "${project.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.api.deleteProject(project.id).subscribe({
              next: () => { this.load(); this.showToast('Project deleted'); },
              error: (err) => this.showToast(err?.error?.error?.message || 'Cannot delete', 'danger'),
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
}
