import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, validatePasswordStrength, normalizeEmail } from '../src/lib/password';
import { createSessionToken, verifySessionToken } from '../src/lib/session';
import { hasRole, hasPermission, assertRole, assertPermission } from '../src/core/services/rbac.service';
import { resolveMarketContext } from '../src/core/services/market-resolution.service';
import { AuthorizationError, ValidationError, NotFoundError } from '../src/lib/errors';
import { UserRole } from '../src/core/domain/domain-types';

async function runTests() {
  console.log('=== Starting Phase 1B Automated Verification Test Suite ===\n');

  // -------------------------------------------------------------
  // Test Group 1: Password Validation & Hashing
  // -------------------------------------------------------------
  console.log('[Test 1.1] Password strength validation: rejects weak passwords');
  assert.throws(() => validatePasswordStrength('short'), ValidationError);
  assert.throws(() => validatePasswordStrength('alllowercase1'), ValidationError);
  assert.throws(() => validatePasswordStrength('ALLUPPERCASE1'), ValidationError);
  assert.throws(() => validatePasswordStrength('NoNumbersHere'), ValidationError);

  console.log('[Test 1.2] Password strength validation: accepts strong password');
  assert.doesNotThrow(() => validatePasswordStrength('StrongPass@123'));

  console.log('[Test 1.3] Email normalization');
  assert.equal(normalizeEmail('  John.Doe@Example.COM  '), 'john.doe@example.com');

  console.log('[Test 1.4] Password hashing & verification');
  const password = 'StrongPass@123';
  const hash = await hashPassword(password);
  assert.notEqual(password, hash);
  assert.ok(hash.startsWith('$2'));

  const valid = await verifyPassword(password, hash);
  assert.equal(valid, true, 'Valid password verification failed');

  const invalid = await verifyPassword('WrongPassword@999', hash);
  assert.equal(invalid, false, 'Invalid password should not verify');
  console.log('✔ Password & hashing tests passed.\n');

  // -------------------------------------------------------------
  // Test Group 2: Session Token Creation & Verification
  // -------------------------------------------------------------
  console.log('[Test 2.1] Session creation & decoding');
  const sessionPayload = {
    userId: 'user_mock_123',
    email: 'student@example.com',
    globalRoles: ['student'] as UserRole[]
  };
  const token = await createSessionToken(sessionPayload);
  assert.ok(typeof token === 'string' && token.length > 20);

  const decoded = await verifySessionToken(token);
  assert.ok(decoded !== null);
  assert.equal(decoded.userId, sessionPayload.userId);
  assert.equal(decoded.email, sessionPayload.email);
  assert.deepEqual(decoded.globalRoles, ['student']);

  console.log('[Test 2.2] Tampered token rejection');
  const tamperedToken = token.slice(0, -5) + 'abcde';
  const tamperedDecoded = await verifySessionToken(tamperedToken);
  assert.equal(tamperedDecoded, null, 'Tampered token must not verify');
  console.log('✔ Session & token security tests passed.\n');

  // -------------------------------------------------------------
  // Test Group 3: RBAC Role & Permission Verification
  // -------------------------------------------------------------
  console.log('[Test 3.1] Student permissions');
  const studentRoles: UserRole[] = ['student'];
  assert.equal(hasPermission(studentRoles, 'content:read'), true);
  assert.equal(hasPermission(studentRoles, 'assignments:submit'), true);
  assert.equal(hasPermission(studentRoles, 'courses:write'), false);
  assert.equal(hasPermission(studentRoles, 'markets:manage'), false);
  assert.throws(() => assertPermission(studentRoles, 'courses:write'), AuthorizationError);

  console.log('[Test 3.2] Admin permissions');
  const adminRoles: UserRole[] = ['admin'];
  assert.equal(hasPermission(adminRoles, 'courses:write'), true);
  assert.equal(hasPermission(adminRoles, 'commerce:write'), true);
  assert.equal(hasPermission(adminRoles, 'markets:manage'), false); // Only superadmin

  console.log('[Test 3.3] Superadmin permissions');
  const superAdminRoles: UserRole[] = ['superadmin'];
  assert.equal(hasPermission(superAdminRoles, 'markets:manage'), true);
  assert.equal(hasPermission(superAdminRoles, 'courses:write'), true);

  console.log('[Test 3.4] Role assertion guards');
  assert.doesNotThrow(() => assertRole(adminRoles, ['admin', 'superadmin']));
  assert.throws(() => assertRole(studentRoles, ['admin']), AuthorizationError);
  console.log('✔ RBAC capability matrix tests passed.\n');

  // -------------------------------------------------------------
  // Test Group 4: Market Context Resolution Rules
  // -------------------------------------------------------------
  console.log('[Test 4.1] Development market override: ?market=MY');
  const devMY = resolveMarketContext({
    searchParams: new URLSearchParams('market=MY'),
    isProductionOverride: false
  });
  assert.equal(devMY.code, 'MY');
  assert.equal(devMY.currency, 'MYR');

  console.log('[Test 4.2] Development market override: ?market=SG');
  const devSG = resolveMarketContext({
    searchParams: new URLSearchParams('market=SG'),
    isProductionOverride: false
  });
  assert.equal(devSG.code, 'SG');
  assert.equal(devSG.currency, 'SGD');

  console.log('[Test 4.3] Production authoritative hostname: sg.bimacademy.com');
  const prodSG = resolveMarketContext({
    host: 'sg.bimacademy.com',
    searchParams: new URLSearchParams('market=MY'), // Attempted query override in prod
    isProductionOverride: true
  });
  assert.equal(prodSG.code, 'SG', 'Production must ignore query override and resolve SG');

  console.log('[Test 4.4] Production authoritative hostname: my.bimacademy.com');
  const prodMY = resolveMarketContext({
    host: 'my.bimacademy.com',
    searchParams: new URLSearchParams('market=SG'), // Attempted query override in prod
    isProductionOverride: true
  });
  assert.equal(prodMY.code, 'MY', 'Production must ignore query override and resolve MY');

  console.log('[Test 4.5] Production unknown hostname failure (fail-safe)');
  assert.throws(() => {
    resolveMarketContext({
      host: 'unknown-intruder.com',
      isProductionOverride: true
    });
  }, NotFoundError);

  console.log('✔ Market resolution security & isolation tests passed.\n');

  console.log('=============================================================');
  console.log('🎉 ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY! (0 ERRORS)');
  console.log('=============================================================');
}

runTests().catch(err => {
  console.error('❌ Test suite execution failed:', err);
  process.exit(1);
});
