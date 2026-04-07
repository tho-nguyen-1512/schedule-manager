import { Component, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonModal, ToastController } from '@ionic/angular';
import { ApiService, Assignment, Member, Project } from '../../services/api.service';

@Component({
  selector: 'app-assignments',
  templateUrl: './assignments.page.html',
  standalone: false,
})
export class AssignmentsPage implements OnInit {
  assignments: Assignment[] = [];
  members: Member[] = [];
  projects: Project[] = [];
  @ViewChild('addModal') addModal!: IonModal;

  form = { memberId: '', projectId: '', subProjectId: '' };
  filteredSubs: { id: string; name: string }[] = [];

  constructor(
    private api: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getAssignments().subscribe((a) => (this.assignments = a));
    this.api.getMembers().subscribe((m) => (this.members = m));
    this.api.getProjects().subscribe((p) => (this.projects = p));
  }

  onProjectChange() {
    const proj = this.projects.find((p) => p.id === this.form.projectId);
    this.filteredSubs = proj?.subProjects ?? [];
    this.form.subProjectId = this.filteredSubs.length === 1 ? this.filteredSubs[0].id : '';
  }

  openAdd() {
    this.form = { memberId: '', projectId: '', subProjectId: '' };
    this.filteredSubs = [];
    this.addModal.present();
  }

  async saveAssignment() {
    try {
      await this.api.createAssignment(this.form).toPromise();
      this.addModal.dismiss();
      this.load();
      this.showToast('Assignment created');
    } catch (err: any) {
      this.showToast(err?.error?.error?.message || 'Error', 'danger');
    }
  }

  async confirmDelete(a: Assignment) {
    const name = a.member?.name ?? a.memberId;
    const proj = a.project?.name ?? a.projectId;
    const alert = await this.alertCtrl.create({
      header: 'Remove Assignment',
      message: `Remove ${name} from ${proj}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.api.deleteAssignment(a.id).subscribe(() => {
              this.load();
              this.showToast('Assignment removed');
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
