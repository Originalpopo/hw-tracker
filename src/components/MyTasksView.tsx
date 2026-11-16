'use client';

// "งานของฉัน" - งานรายวันที่บันทึกเอง แยกจากงานในชีตครูโดยสิ้นเชิง (collection hw_my_tasks)
// 2 คอลัมน์: ยังไม่ทำ -> (ทำเสร็จแล้ว) -> ทำเสร็จแล้ว -> (ครูให้แก้ไข) -> กลับมายังไม่ทำ
import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { BookOpen, CheckCircle, Edit2, GraduationCap, Home, RotateCcw, Save, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { MyTask, MyTaskKind, getMyTasks, addMyTask, updateMyTask, deleteMyTask } from '@/lib/db';
import { getMyTasksDemo } from '@/lib/homeworkDemo';
import { daysUntilDue, dueBadge, DueTone, localDateStr, thaiShortDate } from '@/lib/dueDate';

const DONE_PAGE_SIZE = 10;

const KIND: Record<MyTaskKind, { label: string; Icon: typeof Home; cls: string }> = {
  in_class: { label: 'งานในคาบ', Icon: GraduationCap, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  homework: { label: 'การบ้าน', Icon: Home, cls: 'text-[#486cb8] bg-[#eef3fc] border-[#597ecf]/30' },
};

const BADGE_TONE: Record<DueTone, string> = {
  overdue: 'bg-rose-600 text-white',
  soon: 'bg-amber-100 text-amber-800',
  later: 'bg-gray-100 text-gray-600',
};

type FormState = { subject: string; kind: MyTaskKind; detail: string; assigned_date: string; due_date: string };

// ปุ่ม "เพิ่มงาน" อยู่ในหัวหน้า (นอกคอมโพเนนต์นี้) - กดแล้วส่งเลข addRequest ใหม่มา = เปิดฟอร์มเพิ่มงาน
export default function MyTasksView({ studentName, subjects, filterSubject, onFilterSubject, demo, addRequest, switcher }: {
  switcher: React.ReactNode; // ปุ่มสลับ งานค้างจากครู / งานของฉัน (มาจากหน้าหลัก วางซ้ายในแถบเครื่องมือ)
  studentName: string;
  subjects: string[];
  filterSubject: string;
  onFilterSubject: (s: string) => void;
  demo: boolean;
  addRequest: number;
}) {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [donePage, setDonePage] = useState(1);

  function emptyForm(): FormState {
    return {
      subject: filterSubject !== 'All' ? filterSubject : '',
      kind: 'homework',
      detail: '',
      assigned_date: localDateStr(),
      due_date: '',
    };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = demo ? getMyTasksDemo(studentName) : await getMyTasks(studentName);
        if (!cancelled) setTasks(data);
      } catch (e) {
        console.error('Error loading my tasks:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentName, demo]);

  // วิชาให้เลือก: ตามชีตครู + วิชาที่เคยบันทึกไว้ (เผื่อครูเปลี่ยนชื่อวิชาภายหลัง)
  const subjectOptions = useMemo(() => {
    const set = new Set(subjects);
    tasks.forEach(t => t.subject && set.add(t.subject));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [subjects, tasks]);

  const filtered = useMemo(
    () => (filterSubject === 'All' ? tasks : tasks.filter(t => t.subject === filterSubject)),
    [tasks, filterSubject]
  );

  // ยังไม่ทำ: ใกล้กำหนดส่งก่อน (ไม่มีกำหนดส่งไว้ท้าย) แล้วตามวันที่สั่ง
  const todo = useMemo(() => filtered.filter(t => t.status !== 'done').sort((a, b) => {
    const da = daysUntilDue(a.due_date), dbb = daysUntilDue(b.due_date);
    if (da !== dbb) return (da ?? Infinity) - (dbb ?? Infinity);
    return (a.assigned_date || '').localeCompare(b.assigned_date || '');
  }), [filtered]);

  // ทำเสร็จแล้ว: ล่าสุดอยู่บน แบ่งหน้าละ 10
  const done = useMemo(() => filtered.filter(t => t.status === 'done').sort((a, b) => (b.done_at || 0) - (a.done_at || 0)), [filtered]);
  const pageCount = Math.max(1, Math.ceil(done.length / DONE_PAGE_SIZE));
  const page = Math.min(donePage, pageCount);
  const donePageItems = done.slice((page - 1) * DONE_PAGE_SIZE, page * DONE_PAGE_SIZE);

  const summary = useMemo(() => {
    let overdue = 0, soon = 0;
    todo.forEach(t => {
      const d = daysUntilDue(t.due_date);
      if (d === null) return;
      if (d < 0) overdue++; else if (d <= 1) soon++;
    });
    return { overdue, soon, todo: todo.length };
  }, [todo]);

  const patchLocal = (id: string, data: Partial<MyTask>) =>
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...data, updated_at: Date.now() } : t)));

  const save = async (id: string, data: Partial<MyTask>) => {
    patchLocal(id, data);
    if (demo) return;
    try { await updateMyTask(id, data); } catch (e) { console.error(e); alert('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'); }
  };

  const markDone = (t: MyTask) => save(t.id!, { status: 'done', done_at: Date.now() });
  const sendBack = (t: MyTask) => save(t.id!, { status: 'todo', done_at: null, rework_count: (t.rework_count || 0) + 1 });

  const remove = async (t: MyTask) => {
    if (!window.confirm(`ลบงาน "${t.detail}" ใช่ไหม?\nลบแล้วกู้คืนไม่ได้`)) return;
    setTasks(prev => prev.filter(x => x.id !== t.id));
    if (demo) return;
    try { await deleteMyTask(t.id!); } catch (e) { console.error(e); alert('ลบไม่สำเร็จ ลองใหม่อีกครั้ง'); }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (t: MyTask) => {
    setEditingId(t.id!);
    setForm({ subject: t.subject, kind: t.kind, detail: t.detail, assigned_date: t.assigned_date || '', due_date: t.due_date || '' });
    setFormError('');
    setFormOpen(true);
    setTimeout(() => document.getElementById('my-task-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  useEffect(() => {
    if (addRequest > 0) {
      openAdd();
      setTimeout(() => document.getElementById('my-task-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addRequest]);

  const closeForm = () => { setFormOpen(false); setEditingId(null); setFormError(''); };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject) { setFormError('เลือกวิชาก่อน'); return; }
    if (!form.detail.trim()) { setFormError('ใส่รายละเอียดงานก่อน'); return; }
    if (form.due_date && form.assigned_date && form.due_date < form.assigned_date) { setFormError('กำหนดส่งต้องไม่ก่อนวันที่สั่ง'); return; }
    const data = {
      subject: form.subject,
      kind: form.kind,
      detail: form.detail.trim(),
      assigned_date: form.assigned_date || localDateStr(),
      due_date: form.due_date || '',
    };
    if (editingId) {
      await save(editingId, data);
      closeForm();
      return;
    }
    setSaving(true);
    try {
      const base: Omit<MyTask, 'id' | 'created_at' | 'updated_at'> = { ...data, student_name: studentName, status: 'todo', done_at: null, rework_count: 0 };
      const id = demo ? `demo_my_new_${Date.now()}` : await addMyTask(base);
      setTasks(prev => [...prev, { ...base, id, created_at: Date.now(), updated_at: Date.now() }]);
      // เพิ่มต่อได้เลย: เก็บวิชา/ชนิด/วันที่ไว้ ล้างแค่รายละเอียดกับกำหนดส่ง
      setForm(f => ({ ...f, detail: '', due_date: '' }));
      setFormError('');
    } catch (err) {
      console.error(err);
      setFormError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-11 text-sm text-gray-800 bg-white border border-[#e2e8f0] rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#597ecf]';

  return (
    <>
      {/* แถบเครื่องมือ: ปุ่มสลับ (ซ้าย) / ตัวเลขสรุป (กลาง) / ตัวกรองวิชา (ขวา) - กล่องแคบจะเรียงลงมา */}
      <div className="@container bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-[#e2e8f0]">
      <div className="flex flex-col gap-3 @4xl:flex-row @4xl:items-center">
        <div className="@4xl:w-[260px] shrink-0">{switcher}</div>
        <div className="flex-1 flex justify-center min-w-0">
        <div className="grid grid-cols-3 gap-2 w-full @4xl:w-[360px]">
          <div className="bg-rose-50 rounded-xl px-2 py-2.5 text-center">
            <div className="text-2xl font-extrabold text-rose-700 leading-tight">{summary.overdue}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-rose-800">เลยกำหนด</div>
          </div>
          <div className="bg-amber-50 rounded-xl px-2 py-2.5 text-center">
            <div className="text-2xl font-extrabold text-amber-700 leading-tight">{summary.soon}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-amber-800">ส่งวันนี้/พรุ่งนี้</div>
          </div>
          <div className="bg-[#eef3fc] rounded-xl px-2 py-2.5 text-center">
            <div className="text-2xl font-extrabold text-[#486cb8] leading-tight">{summary.todo}</div>
            <div className="text-[11px] sm:text-xs font-semibold text-[#3b5a9e]">ยังไม่ทำ</div>
          </div>
        </div>
        </div>
        <div className="@4xl:w-[220px] shrink-0">
          <label className="flex items-center bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl px-3 h-11 w-full">
            <span className="sr-only">กรองวิชา</span>
            <select
              value={filterSubject === 'All' || subjectOptions.includes(filterSubject) ? filterSubject : 'All'}
              onChange={(e) => { onFilterSubject(e.target.value); setDonePage(1); }}
              className="h-full text-sm border-none outline-none bg-transparent text-gray-700 font-medium w-full cursor-pointer"
            >
              <option value="All">ทุกวิชา</option>
              {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>
      </div>

      {/* ฟอร์มเพิ่ม / แก้ไขงาน */}
      {formOpen && (
        <form id="my-task-form" onSubmit={submitForm} className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-[#597ecf]/40 scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">{editingId ? 'แก้ไขงาน' : 'เพิ่มงานของฉัน'}</h2>
            <button type="button" onClick={closeForm} aria-label="ปิดฟอร์ม" className="w-11 h-11 -m-2 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="mt-subject" className="block text-xs font-bold text-gray-600 mb-1">วิชา</label>
              <select id="mt-subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={inputCls}>
                <option value="">เลือกวิชา</option>
                {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-600 mb-1">ชนิดของงาน</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ชนิดของงาน">
                {(['in_class', 'homework'] as MyTaskKind[]).map(k => {
                  const { label, Icon } = KIND[k];
                  const on = form.kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setForm(f => ({ ...f, kind: k }))}
                      className={clsx(
                        'h-11 rounded-xl text-sm font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95',
                        on ? (k === 'in_class' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-[#597ecf] border-[#597ecf] text-white') : 'bg-white border-[#e2e8f0] text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="mt-detail" className="block text-xs font-bold text-gray-600 mb-1">รายละเอียดงาน</label>
            <textarea
              id="mt-detail"
              rows={2}
              value={form.detail}
              onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
              className="w-full text-sm text-gray-800 bg-white border border-[#e2e8f0] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#597ecf] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mt-assigned" className="block text-xs font-bold text-gray-600 mb-1">วันที่สั่ง</label>
              <input id="mt-assigned" type="date" value={form.assigned_date} onChange={e => setForm(f => ({ ...f, assigned_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mt-due" className="block text-xs font-bold text-gray-600 mb-1">กำหนดส่ง</label>
              <input id="mt-due" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls} />
            </div>
          </div>

          {formError && <p className="text-sm font-semibold text-rose-600" role="alert">{formError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={closeForm} className="h-11 px-4 text-sm font-semibold text-gray-600 bg-white border border-[#e2e8f0] rounded-xl hover:bg-gray-50 cursor-pointer">
              {editingId ? 'ยกเลิก' : 'ปิด'}
            </button>
            <button type="submit" disabled={saving} className="h-11 px-5 text-sm font-bold text-white bg-[#597ecf] hover:bg-[#486cb8] rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50">
              <Save className="w-4 h-4" /> {editingId ? 'บันทึกการแก้ไข' : 'บันทึกงาน'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. ยังไม่ทำ */}
          <Column title="ยังไม่ทำ" icon={<BookOpen className="w-5 h-5 text-[#57627a]" />} count={todo.length} tone="todo">
            {todo.length === 0 && <Empty text={tasks.length === 0 ? 'ยังไม่มีงาน กด "เพิ่มงาน" เพื่อบันทึกงานแรก' : 'ไม่มีงานค้าง'} />}
            {todo.map(t => {
              const d = daysUntilDue(t.due_date);
              const badge = d === null ? null : dueBadge(d);
              return (
                <Card key={t.id} task={t} badge={badge} actions={
                  <>
                    <button type="button" onClick={() => openEdit(t)} aria-label={`แก้ไขงาน ${t.detail}`} title="แก้ไข" className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#597ecf] hover:bg-[#eef3fc] cursor-pointer transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => remove(t)} aria-label={`ลบงาน ${t.detail}`} title="ลบ" className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                }>
                  <button
                    type="button"
                    onClick={() => markDone(t)}
                    className={clsx(
                      'mt-3 w-full h-12 px-4 rounded-xl text-base font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer text-white',
                      t.rework_count ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    )}
                  >
                    <CheckCircle className="w-5 h-5" /> {t.rework_count ? 'แก้ไขเสร็จแล้ว' : 'ทำเสร็จแล้ว'}
                  </button>
                </Card>
              );
            })}
          </Column>

          {/* 2. ทำเสร็จแล้ว (ล่าสุดอยู่บน หน้าละ 10) */}
          <Column title="ทำเสร็จแล้ว" icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} count={done.length} tone="done">
            {done.length === 0 && <Empty text="ยังไม่มีงานที่ทำเสร็จ" />}
            {donePageItems.map(t => (
              <Card key={t.id} task={t} badge={null} actions={null}>
                <div className="mt-3 h-12 flex items-center justify-between gap-2 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800">ทำเสร็จ {t.done_at ? thaiShortDate(localDateStr(new Date(t.done_at))) : ''}</span>
                  <button
                    type="button"
                    onClick={() => sendBack(t)}
                    title="ครูให้แก้ไข งานจะกลับไปช่องยังไม่ทำ"
                    className="text-xs text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-3 h-9 rounded-lg font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap transition-all active:scale-95 shadow-2xs shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> ครูให้แก้ไข
                  </button>
                </div>
              </Card>
            ))}
            {pageCount > 1 && (
              <nav aria-label="เลือกหน้างานที่ทำเสร็จแล้ว" className="flex items-center justify-center gap-1 pt-2 flex-wrap">
                <button type="button" onClick={() => setDonePage(Math.max(1, page - 1))} disabled={page === 1} aria-label="หน้าก่อน" className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDonePage(n)}
                    aria-current={n === page ? 'page' : undefined}
                    className={clsx('min-w-10 h-10 px-2 rounded-lg text-sm font-bold cursor-pointer transition-colors', n === page ? 'bg-[#597ecf] text-white' : 'text-gray-600 hover:bg-gray-100')}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setDonePage(Math.min(pageCount, page + 1))} disabled={page === pageCount} aria-label="หน้าถัดไป" className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </Column>
        </div>
      )}
    </>
  );
}

function Column({ title, icon, count, tone, children }: { title: string; icon: React.ReactNode; count: number; tone: 'todo' | 'done'; children: React.ReactNode }) {
  const border = tone === 'todo' ? 'border-[#e2e8f0]' : 'border-emerald-200';
  return (
    <section className={clsx('rounded-3xl border flex flex-col h-full bg-white shadow-xs', border)}>
      <div className={clsx('px-5 py-4 border-b flex items-center justify-between rounded-t-3xl', border, tone === 'todo' ? 'bg-[#eff2f7]' : 'bg-emerald-50')}>
        <h3 className="font-bold text-gray-900 flex items-center text-sm sm:text-base">{icon} <span className="ml-2">{title}</span></h3>
        <span className="bg-white text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs border border-gray-200/50">{count}</span>
      </div>
      <div className="p-4 flex-1 space-y-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-12 text-gray-400 text-sm">{text}</div>;
}

function Card({ task, badge, actions, children }: { task: MyTask; badge: { label: string; tone: DueTone } | null; actions: React.ReactNode; children: React.ReactNode }) {
  const kind = KIND[task.kind] || KIND.homework;
  const KindIcon = kind.Icon;
  return (
    <article className={clsx(
      'bg-white p-4 rounded-2xl shadow-xs border transition-all',
      badge?.tone === 'overdue' ? 'border-rose-200' : badge?.tone === 'soon' ? 'border-amber-200' : 'border-[#e2e8f0]'
    )}>
      <div className="flex justify-between items-start gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {!!task.rework_count && task.status !== 'done' && (
            <span className="text-[10px] font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded-md flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ต้องแก้!
            </span>
          )}
          <span className="text-xs font-bold text-[#597ecf] bg-[#eef3fc] px-2.5 py-0.5 rounded-lg border border-[#597ecf]/20">{task.subject}</span>
          <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1', kind.cls)}>
            <KindIcon className="w-3 h-3" /> {kind.label}
          </span>
        </div>
        {badge && (
          <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0', BADGE_TONE[badge.tone])}>{badge.label}</span>
        )}
      </div>
      <p className="text-[15px] font-semibold text-gray-900 whitespace-pre-line break-words">{task.detail}</p>
      {/* แถวล่าง: วันที่ (ซ้าย) + ปุ่มแก้ไข/ลบ (ขวา) - ไม่ไปเบียดชื่อวิชาด้านบนบนมือถือ */}
      <div className="mt-2 pt-1 border-t border-gray-100 flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 py-1.5">
          <span>สั่ง <strong className="text-gray-700 font-medium">{thaiShortDate(task.assigned_date)}</strong></span>
          {task.due_date && <span>ส่ง <strong className="text-gray-700 font-semibold">{thaiShortDate(task.due_date)}</strong></span>}
        </p>
        {actions && <div className="flex items-center shrink-0 -mr-2">{actions}</div>}
      </div>
      {children}
    </article>
  );
}
