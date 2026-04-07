import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  buildTaskReconcilePatch,
  computeTaskIsDelayed,
  todayIsoLocal,
} from './task-reconcile.util';

export interface ApiResponse<T> {
  data: T;
  meta: { requestId: string };
}

export interface ListData<T> {
  items: T[];
}

export interface Member {
  id: string;
  name: string;
  coreProjectIds: string[];
  supProjectIds: string[];
  email?: string;
  role?: string;
  dateOfBirth?: string;
  phone?: string;
  startDate?: string;
}

export interface Project {
  id: string;
  name: string;
  emails: string[];
  resources: string[];
  documents: string[];
  subProjects: SubProject[];
}

export interface SubProject {
  id: string;
  name: string;
  parentProjectId: string;
}

export interface Assignment {
  id: string;
  memberId: string;
  projectId: string;
  subProjectId: string;
  member?: { id: string; name: string };
  project?: { id: string; name: string };
  subProject?: { id: string; name: string };
}

export interface Task {
  id: string;
  title: string;
  memberId: string;
  projectId: string;
  subProjectId: string;
  startDate: string;
  endDate: string;
  completionDate: string | null;
  durationDays: number;
  progressPercent: number;
  status: string;
  comments: string | null;
  priority: string;
  /** Set client-side after GET / reconcile; UI delay column. */
  isDelayed?: boolean;
}

export interface DashboardTaskStatusDistribution {
  todo: number;
  inProgress: number;
  done: number;
}

export interface DashboardMemberWorkloadRank {
  memberId: string;
  memberName: string;
  doneTaskCount: number;
  delayedTaskCount: number;
}

export interface DashboardProjectHealthRow {
  projectId: string;
  projectName: string;
  doneCount: number;
  inProgressCount: number;
  delayedCount: number;
}

export interface DashboardUpcomingDueDayProject {
  projectId: string;
  projectName: string;
  count: number;
}

export interface DashboardUpcomingDueDay {
  date: string;
  /** Sum of `byProject` counts. */
  count: number;
  /** Same project order on every day; includes all projects that have at least one upcoming-due task in the 14-day window. */
  byProject: DashboardUpcomingDueDayProject[];
}

export interface DashboardSummary {
  periodType: string;
  period: string;
  totalMembers: number;
  totalProjects: number;
  /** Tasks whose `endDate` lies in the selected period. */
  totalTasks: number;
  delayedTasksInPeriod: number;
  /** DONE with `completionDate`, among tasks whose `endDate` lies in the selected period. */
  completedTasksInPeriod: number;
  taskStatusDistribution: DashboardTaskStatusDistribution;
  /** Per-member DONE / delayed among tasks in period (delayed = progress under 100% and today past `endDate`). */
  memberWorkloadRanking: DashboardMemberWorkloadRank[];
  /** Per-project stacked health: cohort = same period as other dashboard task metrics. */
  projectHealthByProject: DashboardProjectHealthRow[];
  /** Next 14 calendar days from server `today` (UTC): incomplete tasks (`status` ≠ DONE) with `endDate` on that day. Not filtered by dashboard period. */
  upcomingDueByDay: DashboardUpcomingDueDay[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private unwrap<T>(obs: Observable<ApiResponse<T>>): Observable<T> {
    return obs.pipe(map((r) => r.data));
  }

  // --- Dashboard ---
  getDashboard(periodType: string, period: string): Observable<DashboardSummary> {
    const params = new HttpParams().set('periodType', periodType).set('period', period);
    return this.unwrap(
      this.http.get<ApiResponse<DashboardSummary>>(`${this.base}/dashboard`, { params })
    );
  }

  // --- Members ---
  getMembers(): Observable<Member[]> {
    return this.unwrap(this.http.get<ApiResponse<ListData<Member>>>(`${this.base}/members`)).pipe(
      map((d) => d.items)
    );
  }

  getMember(id: string): Observable<Member> {
    return this.unwrap(this.http.get<ApiResponse<Member>>(`${this.base}/members/${id}`));
  }

  createMember(data: Partial<Member>): Observable<Member> {
    return this.unwrap(this.http.post<ApiResponse<Member>>(`${this.base}/members`, data));
  }

  updateMember(id: string, data: Partial<Member>): Observable<Member> {
    return this.unwrap(this.http.patch<ApiResponse<Member>>(`${this.base}/members/${id}`, data));
  }

  deleteMember(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/members/${id}`);
  }

  // --- Projects ---
  getProjects(): Observable<Project[]> {
    return this.unwrap(this.http.get<ApiResponse<ListData<Project>>>(`${this.base}/projects`)).pipe(
      map((d) => d.items)
    );
  }

  getProject(id: string): Observable<Project> {
    return this.unwrap(this.http.get<ApiResponse<Project>>(`${this.base}/projects/${id}`));
  }

  createProject(data: Partial<Project>): Observable<Project> {
    return this.unwrap(this.http.post<ApiResponse<Project>>(`${this.base}/projects`, data));
  }

  updateProject(id: string, data: Partial<Project>): Observable<Project> {
    return this.unwrap(this.http.patch<ApiResponse<Project>>(`${this.base}/projects/${id}`, data));
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/projects/${id}`);
  }

  createSubProject(projectId: string, data: { name: string }): Observable<SubProject> {
    return this.unwrap(
      this.http.post<ApiResponse<SubProject>>(`${this.base}/projects/${projectId}/sub-projects`, data)
    );
  }

  updateSubProject(id: string, data: { name: string }): Observable<SubProject> {
    return this.unwrap(
      this.http.patch<ApiResponse<SubProject>>(`${this.base}/sub-projects/${id}`, data)
    );
  }

  deleteSubProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sub-projects/${id}`);
  }

  // --- Assignments ---
  getAssignments(query?: {
    memberId?: string;
    projectId?: string;
    subProjectId?: string;
  }): Observable<Assignment[]> {
    let params = new HttpParams();
    if (query?.memberId) params = params.set('memberId', query.memberId);
    if (query?.projectId) params = params.set('projectId', query.projectId);
    if (query?.subProjectId) params = params.set('subProjectId', query.subProjectId);
    return this.unwrap(
      this.http.get<ApiResponse<ListData<Assignment>>>(`${this.base}/assignments`, { params })
    ).pipe(map((d) => d.items));
  }

  createAssignment(data: {
    memberId: string;
    projectId: string;
    subProjectId: string;
  }): Observable<Assignment> {
    return this.unwrap(
      this.http.post<ApiResponse<Assignment>>(`${this.base}/assignments`, data)
    );
  }

  deleteAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assignments/${id}`);
  }

  // --- Tasks ---
  getTasks(query?: {
    memberId?: string;
    projectId?: string;
    subProjectId?: string;
    status?: string;
    week?: string;
    month?: string;
  }): Observable<Task[]> {
    let params = new HttpParams();
    if (query?.memberId) params = params.set('memberId', query.memberId);
    if (query?.projectId) params = params.set('projectId', query.projectId);
    if (query?.subProjectId) params = params.set('subProjectId', query.subProjectId);
    if (query?.status) params = params.set('status', query.status);
    if (query?.week) params = params.set('week', query.week);
    if (query?.month) params = params.set('month', query.month);
    return this.unwrap(
      this.http.get<ApiResponse<ListData<Task>>>(`${this.base}/tasks`, { params })
    ).pipe(switchMap((d) => this.reconcileTasksAfterFetch(d.items)));
  }

  /**
   * Aligns status/completionDate with progress rules; PATCHes only when needed.
   * Annotates each task with `isDelayed` for UI.
   */
  private reconcileTasksAfterFetch(tasks: Task[]): Observable<Task[]> {
    const today = todayIsoLocal();
    if (tasks.length === 0) {
      return of([]);
    }
    const annotate = (task: Task): Task => ({
      ...task,
      isDelayed: computeTaskIsDelayed(task, today),
    });
    const ops = tasks.map((t) => {
      const patch = buildTaskReconcilePatch(t, today);
      if (!patch) {
        return of(annotate(t));
      }
      return this.updateTask(t.id, patch).pipe(
        map((updated) => annotate(updated)),
        catchError(() => of(annotate({ ...t, ...patch } as Task)))
      );
    });
    return forkJoin(ops);
  }

  createTask(data: Partial<Task>): Observable<Task> {
    return this.unwrap(this.http.post<ApiResponse<Task>>(`${this.base}/tasks`, data));
  }

  updateTask(id: string, data: Partial<Task>): Observable<Task> {
    return this.unwrap(this.http.patch<ApiResponse<Task>>(`${this.base}/tasks/${id}`, data));
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tasks/${id}`);
  }

  // --- Reports ---
  downloadWeeklyCsv(week: string): void {
    window.open(`${this.base}/reports/weekly.csv?week=${week}`, '_blank');
  }

  downloadMonthlyCsv(month: string): void {
    window.open(`${this.base}/reports/monthly.csv?month=${month}`, '_blank');
  }
}
