'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AdmissionSource, CommissionType, Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/money';
import { calculateAdmissionFinancials } from '@/lib/calculations';
import { createAdmissionAction } from '../actions';
import { BlobUploadField, type UploadedFile } from '@/components/uploads/blob-upload-field';

type SimpleUniversity = { id: string; name: string };
type SimpleCourse = {
  id: string;
  universityId: string;
  name: string;
  universityFee: number;
  displayFee: number;
  session: string | null;
};
type SimpleAgent = { id: string; parentId: string | null; name: string; userId: string };
type SimpleConsultant = { id: string; name: string; userId: string };

type SimpleCommission = {
  agentId: string;
  courseId: string;
  type: CommissionType;
  value: number;
  isActive: boolean;
};

type ExpenseRow = { title: string; amount: number; proofFile?: UploadedFile };
type AgentSearchItem = { id: string; userId: string; name: string; parentId: string | null };

const STEPS = ['Student', 'Course', 'Fee', 'Source', 'Expenses', 'Summary', 'Submit'] as const;
const phoneRegex = /^\+?[0-9][0-9\s-]{7,14}$/;

function StepPill(props: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={
        props.active
          ? 'rounded-full bg-zinc-900 px-3 py-1 text-xs text-white'
          : props.done
            ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800'
            : 'rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700'
      }
    >
      {props.label}
    </div>
  );
}

export function AdmissionWizard(props: {
  me: { id: string; role: Role; parentId: string | null };
  consultants: SimpleConsultant[];
  universities: SimpleUniversity[];
  courses: SimpleCourse[];
  agents: SimpleAgent[];
  commissions: SimpleCommission[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, startSubmitting] = React.useTransition();

  const [consultantId, setConsultantId] = React.useState(props.consultants[0]?.id ?? '');
  const [studentName, setStudentName] = React.useState('');
  const [fatherName, setFatherName] = React.useState('');
  const [mobile, setMobile] = React.useState('');
  const [altMobile, setAltMobile] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [photoFiles, setPhotoFiles] = React.useState<UploadedFile[]>([]);
  const [documents, setDocuments] = React.useState<UploadedFile[]>([]);
  const [universityId, setUniversityId] = React.useState('');
  const [courseId, setCourseId] = React.useState('');
  const [admissionSession, setAdmissionSession] = React.useState('');
  const [amountReceived, setAmountReceived] = React.useState(0);
  const [source, setSource] = React.useState<AdmissionSource>(AdmissionSource.DIRECT);
  const [agentId, setAgentId] = React.useState('');
  const [agentCode, setAgentCode] = React.useState('');
  const [agentSearchResults, setAgentSearchResults] = React.useState<AgentSearchItem[]>([]);
  const [agentSearchPending, setAgentSearchPending] = React.useState(false);
  const [selectedAgentLabel, setSelectedAgentLabel] = React.useState('');
  const [duplicateHint, setDuplicateHint] = React.useState<string | null>(null);
  const [agentExpenses, setAgentExpenses] = React.useState<ExpenseRow[]>([]);
  const [consultancyExpenses, setConsultancyExpenses] = React.useState<ExpenseRow[]>([]);

  const selectedCourse = React.useMemo(
    () => props.courses.find((course) => course.id === courseId) ?? null,
    [props.courses, courseId]
  );

  const coursesForUniversity = React.useMemo(
    () => props.courses.filter((course) => course.universityId === universityId),
    [props.courses, universityId]
  );

  React.useEffect(() => {
    if (!selectedCourse) return;
    setAdmissionSession((current) => (current.trim().length > 0 ? current : selectedCourse.session || ''));
  }, [selectedCourse]);

  React.useEffect(() => {
    if (props.me.role !== Role.SUPER_ADMIN) return;
    setAgentId('');
    setAgentCode('');
    setSelectedAgentLabel('');
    setAgentSearchResults([]);
  }, [consultantId, props.me.role]);

  React.useEffect(() => {
    if (source !== AdmissionSource.AGENT) {
      setAgentSearchPending(false);
      setAgentSearchResults([]);
      return;
    }

    const query = agentCode.trim();
    if (query.length < 2) {
      setAgentSearchPending(false);
      setAgentSearchResults([]);
      return;
    }

    let cancelled = false;
    setAgentSearchPending(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query });
        if (props.me.role === Role.SUPER_ADMIN && consultantId) {
          params.set('consultantId', consultantId);
        }
        const response = await fetch(`/api/agents/search?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Unable to search agents');

        const payload = (await response.json()) as { items?: AgentSearchItem[] };
        const items = payload.items ?? [];
        if (cancelled) return;

        setAgentSearchResults(items);

        const exact = items.find((item) => item.userId.toLowerCase() === query.toLowerCase());
        if (exact) {
          setAgentId(exact.id);
          setSelectedAgentLabel(`${exact.name} (${exact.userId})`);
        } else {
          setAgentId('');
          setSelectedAgentLabel('');
        }
      } catch {
        if (cancelled) return;
        setAgentId('');
        setSelectedAgentLabel('');
        setAgentSearchResults([]);
      } finally {
        if (!cancelled) setAgentSearchPending(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [source, agentCode, consultantId, props.me.role]);

  React.useEffect(() => {
    const q = mobile.trim();
    if (q.length < 8) {
      setDuplicateHint(null);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admissions/duplicates?mobile=${encodeURIComponent(q)}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: Array<{ studentName: string; createdAt: string }> };
        if (cancelled) return;
        const first = payload.items?.[0];
        setDuplicateHint(
          first
            ? `Possible duplicate found: ${first.studentName} (${new Date(first.createdAt).toLocaleDateString()})`
            : null
        );
      } catch {
        if (!cancelled) setDuplicateHint(null);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [mobile]);

  const commissionConfig = React.useMemo(() => {
    if (source !== AdmissionSource.AGENT || !agentId || !selectedCourse)
      return { type: 'NONE' as const };
    const found = props.commissions.find(
      (rule) => rule.agentId === agentId && rule.courseId === selectedCourse.id && rule.isActive
    );
    return found ? { type: found.type, value: found.value } : { type: 'NONE' as const };
  }, [source, agentId, selectedCourse, props.commissions]);

  const expenseTotals = React.useMemo(
    () => ({
      agent: agentExpenses.reduce(
        (sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0),
        0
      ),
      consultancy: consultancyExpenses.reduce(
        (sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0),
        0
      ),
    }),
    [agentExpenses, consultancyExpenses]
  );

  const financials = React.useMemo(() => {
    return calculateAdmissionFinancials({
      amountReceived,
      universityFee: selectedCourse?.universityFee ?? 0,
      agentCommission: commissionConfig,
      agentExpensesTotal: expenseTotals.agent,
      consultancyExpensesTotal: expenseTotals.consultancy,
    });
  }, [amountReceived, selectedCourse, commissionConfig, expenseTotals]);

  const pendingFee = React.useMemo(
    () => Math.max(0, (selectedCourse?.displayFee ?? 0) - amountReceived),
    [selectedCourse, amountReceived]
  );

  function updateExpense(
    setter: React.Dispatch<React.SetStateAction<ExpenseRow[]>>,
    index: number,
    patch: Partial<ExpenseRow>
  ) {
    setter((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeExpense(
    setter: React.Dispatch<React.SetStateAction<ExpenseRow[]>>,
    index: number
  ) {
    setter((rows) => rows.filter((_, i) => i !== index));
  }

  function addExpense(setter: React.Dispatch<React.SetStateAction<ExpenseRow[]>>) {
    setter((rows) => [...rows, { title: '', amount: 0 }]);
  }

  function onAgentCodeChange(nextCode: string) {
    setAgentCode(nextCode);
    setAgentId('');
    setSelectedAgentLabel('');
  }

  function validate(currentStep: number): string | null {
    if (props.me.role === Role.SUPER_ADMIN && !consultantId) return 'Select consultant';
    if (currentStep === 1) {
      if (studentName.trim().length < 2) return 'Student name is required';
      if (!phoneRegex.test(mobile.trim())) return 'Enter a valid mobile number';
    }
    if (currentStep === 2) {
      if (!universityId || !courseId) return 'University and course are required';
      if (admissionSession.trim().length < 3) return 'Admission session is required';
    }
    if (currentStep === 3) {
      if (amountReceived < 0) return 'Amount cannot be negative';
      if (selectedCourse && amountReceived > selectedCourse.displayFee && props.me.role !== Role.SUPER_ADMIN) {
        return 'Amount received cannot exceed display fee';
      }
    }
    if (currentStep === 4 && source === AdmissionSource.AGENT && !agentId)
      return 'Select a valid agent';
    return null;
  }

  function next() {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((s) => Math.min(7, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function submit() {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    if (!selectedCourse) {
      setError('Course is required');
      return;
    }

    startSubmitting(async () => {
      try {
        const result = await createAdmissionAction({
          consultantId: props.me.role === Role.SUPER_ADMIN ? consultantId : '',
          studentName,
          fatherName,
          mobile,
          altMobile,
          address,
          dob,
          gender,
          photoFile: photoFiles[0],
          documents,
          universityId,
          courseId,
          admissionSession,
          amountReceived,
          source,
          agentId: source === AdmissionSource.AGENT ? agentId : '',
          agentExpenses: agentExpenses.map((row) => ({
            title: row.title,
            amount: row.amount,
            proofFile: row.proofFile,
          })),
          consultancyExpenses: consultancyExpenses.map((row) => ({
            title: row.title,
            amount: row.amount,
            proofFile: row.proofFile,
          })),
        });
        router.push(`/app/admissions/${result.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create admission');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admissions Wizard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          7-step admission flow with direct storage uploads.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <StepPill
            key={label}
            label={`${i + 1}. ${label}`}
            active={step === i + 1}
            done={step > i + 1}
          />
        ))}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {props.me.role === Role.SUPER_ADMIN ? (
        <Card>
          <CardHeader>
            <CardTitle>Consultant Scope</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Consultant</Label>
              <Select value={consultantId} onChange={(e) => setConsultantId(e.target.value)}>
                <option value="" disabled>
                  Select consultant
                </option>
                {props.consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.name} ({consultant.userId})
                  </option>
                ))}
              </Select>
            </div>
            <div className="text-xs text-zinc-600 md:self-end">
              Admission is created under this consultant.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 1 - Student</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label>Student Name</Label>
                  <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Father Name</Label>
                  <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
                  {duplicateHint ? <div className="text-xs text-amber-700">{duplicateHint}</div> : null}
                </div>
                <div className="space-y-1">
                  <Label>Alt Mobile</Label>
                  <Input value={altMobile} onChange={(e) => setAltMobile(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Address</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>DOB</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <BlobUploadField
                    id="photo-upload"
                    label="Student Photo"
                    helpText="Direct upload to object storage"
                    accept="image/*"
                    value={photoFiles}
                    onChange={setPhotoFiles}
                  />
                </div>
                <div className="md:col-span-2">
                  <BlobUploadField
                    id="document-upload"
                    label="Student Documents"
                    helpText="Upload documents used for admission"
                    accept="image/*,application/pdf"
                    multiple
                    value={documents}
                    onChange={setDocuments}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 2 - Course</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label>University</Label>
                  <Select
                    value={universityId}
                    onChange={(e) => {
                      setUniversityId(e.target.value);
                      setCourseId('');
                      setAdmissionSession('');
                    }}
                  >
                    <option value="" disabled>
                      Select university
                    </option>
                    {props.universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Course</Label>
                  <Select
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      const nextCourse = props.courses.find((course) => course.id === e.target.value);
                      setAdmissionSession((current) =>
                        current.trim().length > 0 ? current : nextCourse?.session || ''
                      );
                    }}
                  >
                    <option value="" disabled>
                      Select course
                    </option>
                    {coursesForUniversity.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </Select>
                  {selectedCourse ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>University Fee: {formatINR(selectedCourse.universityFee)}</Badge>
                      <Badge>Display Fee: {formatINR(selectedCourse.displayFee)}</Badge>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Admission Session (Academic Year)</Label>
                  <Input
                    value={admissionSession}
                    onChange={(e) => setAdmissionSession(e.target.value)}
                    placeholder="e.g. 2026-27"
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 3 - Fee Entry</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Amount Received</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    max={props.me.role === Role.SUPER_ADMIN ? undefined : (selectedCourse?.displayFee ?? undefined)}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Auto consultancy profit</Label>
                  <Input readOnly value={formatINR(financials.consultancyProfit)} />
                </div>
                {selectedCourse ? (
                  <div className="text-xs text-zinc-600 md:col-span-2">
                    Display fee cap: <span className="font-medium">{formatINR(selectedCourse.displayFee)}</span>
                    {props.me.role === Role.SUPER_ADMIN ? ' (Super Admin can override).' : ''}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {step === 4 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 4 - Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select
                    value={source}
                    onChange={(e) => {
                      const nextSource = e.target.value as AdmissionSource;
                      setSource(nextSource);
                      if (nextSource === AdmissionSource.DIRECT) {
                        setAgentId('');
                        setAgentCode('');
                        setSelectedAgentLabel('');
                        setAgentSearchResults([]);
                      }
                    }}
                  >
                    <option value={AdmissionSource.DIRECT}>Direct</option>
                    <option value={AdmissionSource.AGENT}>Agent</option>
                  </Select>
                </div>
                {source === AdmissionSource.AGENT ? (
                  <div className="space-y-2">
                    <Label htmlFor="agent-code-search">Agent Code (User ID)</Label>
                    <Input
                      id="agent-code-search"
                      value={agentCode}
                      onChange={(e) => onAgentCodeChange(e.target.value)}
                      placeholder="Type agent code (e.g. agent.a)"
                      autoComplete="off"
                      aria-describedby="agent-search-help"
                    />
                    <div id="agent-search-help" className="text-xs text-zinc-500">
                      {agentSearchPending
                        ? 'Searching agents...'
                        : selectedAgentLabel
                          ? `Selected: ${selectedAgentLabel}`
                          : 'Type at least 2 characters to search by agent code.'}
                    </div>

                    {agentSearchResults.length > 0 ? (
                      <div className="max-h-52 overflow-y-auto rounded-md border border-zinc-200">
                        {agentSearchResults.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                            onClick={() => {
                              setAgentId(agent.id);
                              setAgentCode(agent.userId);
                              setSelectedAgentLabel(`${agent.name} (${agent.userId})`);
                              setAgentSearchResults([]);
                            }}
                          >
                            <span>{agent.name}</span>
                            <span className="text-xs text-zinc-500">{agent.userId}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {!agentSearchPending && agentCode.trim().length >= 2 && !agentId ? (
                      <div className="text-xs text-amber-700">
                        No exact match selected yet. Pick from results to continue.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {step === 5 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 5 - Expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Agent Expenses</div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addExpense(setAgentExpenses)}
                    >
                      Add
                    </Button>
                  </div>
                  {agentExpenses.map((row, index) => (
                    <div key={index} className="space-y-3 rounded-md border border-zinc-200 p-3">
                      <div className="grid gap-2 md:grid-cols-6">
                        <div className="md:col-span-3">
                          <Label>Title</Label>
                          <Input
                            value={row.title}
                            onChange={(e) =>
                              updateExpense(setAgentExpenses, index, { title: e.target.value })
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.amount}
                            onChange={(e) =>
                              updateExpense(setAgentExpenses, index, {
                                amount: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeExpense(setAgentExpenses, index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <BlobUploadField
                        id={`agent-expense-proof-${index}`}
                        label="Proof Upload"
                        accept="image/*,application/pdf"
                        value={row.proofFile ? [row.proofFile] : []}
                        onChange={(files) =>
                          updateExpense(setAgentExpenses, index, { proofFile: files[0] })
                        }
                      />
                    </div>
                  ))}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Consultancy Expenses</div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addExpense(setConsultancyExpenses)}
                    >
                      Add
                    </Button>
                  </div>
                  {consultancyExpenses.map((row, index) => (
                    <div key={index} className="space-y-3 rounded-md border border-zinc-200 p-3">
                      <div className="grid gap-2 md:grid-cols-6">
                        <div className="md:col-span-3">
                          <Label>Title</Label>
                          <Input
                            value={row.title}
                            onChange={(e) =>
                              updateExpense(setConsultancyExpenses, index, {
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.amount}
                            onChange={(e) =>
                              updateExpense(setConsultancyExpenses, index, {
                                amount: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeExpense(setConsultancyExpenses, index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <BlobUploadField
                        id={`consultancy-expense-proof-${index}`}
                        label="Proof Upload"
                        accept="image/*,application/pdf"
                        value={row.proofFile ? [row.proofFile] : []}
                        onChange={(files) =>
                          updateExpense(setConsultancyExpenses, index, { proofFile: files[0] })
                        }
                      />
                    </div>
                  ))}
                </section>
              </CardContent>
            </Card>
          ) : null}
          {step === 6 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 6 - Final Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total received</span>
                  <span className="font-medium">{formatINR(amountReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span>University payable</span>
                  <span className="font-medium">
                    {formatINR(selectedCourse?.universityFee ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Admission session</span>
                  <span className="font-medium">{admissionSession || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Consultancy profit</span>
                  <span className="font-medium">{formatINR(financials.consultancyProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agent commission</span>
                  <span className="font-medium">{formatINR(financials.agentCommissionAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agent expenses</span>
                  <span className="font-medium">{formatINR(expenseTotals.agent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Consultancy expenses</span>
                  <span className="font-medium">{formatINR(expenseTotals.consultancy)}</span>
                </div>
                <div className="border-t border-zinc-200 pt-2 flex justify-between font-semibold">
                  <span>Final net profit</span>
                  <span>{formatINR(financials.netProfit)}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 7 ? (
            <Card>
              <CardHeader>
                <CardTitle>Step 7 - Submit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Admission will be created in SUBMITTED mode and fee fields are locked for
                  consultant edits.
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={back} disabled={submitting}>
                    Back
                  </Button>
                  <Button type="button" onClick={submit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Admission'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step < 7 ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={back} disabled={step === 1}>
                Back
              </Button>
              <Button type="button" onClick={next}>
                Next
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Sticky Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Student</span>
                <span className="font-medium">{studentName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Course</span>
                <span className="font-medium">{selectedCourse?.name ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Session</span>
                <span className="font-medium">{admissionSession || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Source</span>
                <span className="font-medium">
                  {source === AdmissionSource.DIRECT ? 'Direct' : 'Agent'}
                </span>
              </div>
              <div className="border-t border-zinc-200 pt-2 flex justify-between">
                <span>Pending fee</span>
                <span className="font-medium">{formatINR(pendingFee)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Net profit</span>
                <span>{formatINR(financials.netProfit)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-zinc-700">
              <div>Photo: {photoFiles.length}</div>
              <div>Documents: {documents.length}</div>
              <div>
                Expense proofs:{' '}
                {agentExpenses.filter((row) => Boolean(row.proofFile)).length +
                  consultancyExpenses.filter((row) => Boolean(row.proofFile)).length}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
