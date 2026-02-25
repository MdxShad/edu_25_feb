import test from 'node:test';
import assert from 'node:assert/strict';
import { isRouteAllowed, type RbacUser } from '@/lib/rbac';

function user(role: RbacUser['role'], permissions: string[] = []): RbacUser {
  return { role, permissions };
}

test('super admin can access admin routes', () => {
  assert.equal(isRouteAllowed('/app/admin/users', user('SUPER_ADMIN')), true);
});

test('consultant is forbidden from admin routes', () => {
  assert.equal(isRouteAllowed('/app/admin/users', user('CONSULTANT')), false);
});

test('agent can access reports but cannot create admissions', () => {
  assert.equal(isRouteAllowed('/app/reports', user('AGENT')), true);
  assert.equal(isRouteAllowed('/app/admissions/new', user('AGENT')), false);
  assert.equal(isRouteAllowed('/app/posters', user('AGENT')), true);
  assert.equal(isRouteAllowed('/app/ai', user('AGENT')), true);
});

test('staff permissions gate route access', () => {
  assert.equal(isRouteAllowed('/app/admissions', user('STAFF', ['admissionView'])), true);
  assert.equal(isRouteAllowed('/app/admissions/new', user('STAFF', ['admissionView'])), false);
  assert.equal(isRouteAllowed('/app/admissions/new', user('STAFF', ['admissionAdd'])), true);
  assert.equal(isRouteAllowed('/app/ledgers/university', user('STAFF', ['accountsView'])), true);
  assert.equal(isRouteAllowed('/app/reports', user('STAFF', ['admissionView'])), false);
});


test('leads inbox access follows internal role rules', () => {
  assert.equal(isRouteAllowed('/app/leads', user('SUPER_ADMIN')), true);
  assert.equal(isRouteAllowed('/app/leads', user('CONSULTANT')), true);
  assert.equal(isRouteAllowed('/app/leads', user('STAFF', ['leadsView'])), true);
  assert.equal(isRouteAllowed('/app/leads', user('STAFF', ['admissionView'])), false);
  assert.equal(isRouteAllowed('/app/leads', user('AGENT')), false);
});
