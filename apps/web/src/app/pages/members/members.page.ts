import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonModal, ToastController } from '@ionic/angular';
import { ColDef, GridApi, GridReadyEvent, CellStyle } from 'ag-grid-community';
import { ApiService, Member, Project } from '../../services/api.service';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss'],
  standalone: false,
})
export class MembersPage implements OnInit {
  members: Member[] = [];
  projects: Project[] = [];
  @ViewChild('formModal') formModal!: IonModal;
  private gridApi!: GridApi;

  isEditing = false;
  editId = '';
  form: Partial<Member> = {};

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
    this.api.getProjects().subscribe((p) => {
      this.projects = p;
      this.buildColumns();
      this.loadMembers();
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  private buildColumns() {
    const projectMap = Object.fromEntries(this.projects.map((p) => [p.id, p.name]));
    const resolveNames = (ids?: string[]) => {
      if (!ids || ids.length === 0) return '—';
      return ids.map((id) => projectMap[id] ?? id).join('\n');
    };

    this.columnDefs = [
      { field: 'name', headerName: 'Name', minWidth: 160, pinned: 'left', cellStyle: { fontWeight: '600' } },
      { field: 'role', headerName: 'Role', minWidth: 120, valueFormatter: (p) => p.value || '—' },
      {
        field: 'coreProjectIds',
        headerName: 'Project',
        minWidth: 160,
        valueGetter: (p) => resolveNames(p.data?.coreProjectIds),
        autoHeight: true,
        cellClass: 'multiline-cell',
      },
      {
        field: 'supProjectIds',
        headerName: 'Backup Project',
        minWidth: 160,
        valueGetter: (p) => resolveNames(p.data?.supProjectIds),
        autoHeight: true,
        cellClass: 'multiline-cell',
      },
      { field: 'email', headerName: 'Email', minWidth: 180, valueFormatter: (p) => p.value || '—' },
      { field: 'phone', headerName: 'Phone', minWidth: 120, valueFormatter: (p) => p.value || '—' },
      { field: 'dateOfBirth', headerName: 'BOD', minWidth: 115, valueFormatter: (p) => this.fmtDate(p.value) },
      { field: 'startDate', headerName: 'Start Date', minWidth: 115, valueFormatter: (p) => this.fmtDate(p.value) },
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
            this.confirmDelete(params.data);
          }
        },
      },
    ];
  }

  loadMembers() {
    this.api.getMembers().subscribe((m) => {
      this.members = m;
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', m);
      }
    });
  }

  get backupProjectOptions(): Project[] {
    const coreIds = new Set(this.form.coreProjectIds ?? []);
    return this.projects.filter((p) => !coreIds.has(p.id));
  }

  openCreate() {
    this.isEditing = false;
    this.editId = '';
    this.form = { coreProjectIds: [], supProjectIds: [] };
    this.formModal.present();
  }

  openEdit(member: Member) {
    this.isEditing = true;
    this.editId = member.id;
    this.form = { ...member };
    this.formModal.present();
  }

  async save() {
    try {
      if (this.isEditing) {
        await this.api.updateMember(this.editId, this.form).toPromise();
      } else {
        await this.api.createMember(this.form).toPromise();
      }
      this.formModal.dismiss();
      this.loadMembers();
      this.showToast(this.isEditing ? 'Member updated' : 'Member created');
    } catch (err: any) {
      this.showToast(err?.error?.error?.message || 'Error saving member', 'danger');
    }
  }

  async confirmDelete(member: Member) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Member',
      message: `Delete "${member.name}"? This will also delete all their tasks.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.api.deleteMember(member.id).subscribe(() => {
              this.loadMembers();
              this.showToast('Member deleted');
            });
          },
        },
      ],
    });
    await alert.present();
  }

  private fmtDate(val: string): string {
    if (!val) return '—';
    const parts = val.split('-');
    if (parts.length !== 3) return val;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private async showToast(message: string, color = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'top' });
    await toast.present();
  }
}
