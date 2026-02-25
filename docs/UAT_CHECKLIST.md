# EduConnect CRM – UAT Checklist

## Roles
- Super Admin
- Consultant
- Staff (custom permissions)
- Agent

## Admission & Installment Payments
- [ ] Create admission (direct source)
- [ ] Create admission (agent source)
- [ ] Duplicate warning appears for same mobile
- [ ] Agent cannot create admission
- [ ] Collect installment payment from admission detail
- [ ] Installment receipt PDF opens
- [ ] Pending fee updates after installment
- [ ] Non-super-admin cannot write in closed month

## Ledgers
- [ ] University ledger payment add
- [ ] Agent payout add
- [ ] Payment history modal shows complete history
- [ ] Proof links open correctly
- [ ] Non-payment staff cannot add payment

## Leads Pipeline
- [ ] Contact form creates lead
- [ ] Duplicate lead in 7 days is skipped
- [ ] Filter by status works
- [ ] My leads filter works
- [ ] Assign lead to user and add notes
- [ ] Lead status update writes audit log
- [ ] Leads CSV contains status/assignment/notes columns

## Monthly Close
- [ ] Super admin can close month from Admin settings
- [ ] Expense add blocked in closed month (non-super-admin)
- [ ] Ledger payment add blocked in closed month (non-super-admin)

## Security / Role Permissions
- [ ] Agent has view-only restrictions for fees/admissions edit
- [ ] Staff menu shows only allowed modules
- [ ] Staff `leadsView` allows inbox view
- [ ] Staff `leadsManage` allows updates
- [ ] Staff `postersManage` controls posters access

## Sign-off
- Business owner sign-off: ______________________
- QA sign-off: _________________________________
- Date: _______________________________________
