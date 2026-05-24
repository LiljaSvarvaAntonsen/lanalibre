/**
 * @jest-environment node
 *
 * Security rules verification tests — requires the Firebase emulator to be running:
 *   npx firebase emulators:start --only firestore,auth,storage
 * Then run:
 *   npm run test:rules
 */

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const { ref, getMetadata, uploadBytes } = require('firebase/storage');
const { readFileSync } = require('fs');
const path = require('path');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'lanalibre-test',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
    storage: {
      rules: readFileSync(path.resolve(__dirname, '../storage.rules'), 'utf8'),
      host: 'localhost',
      port: 9199,
    },
  });
}, 30000);

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ---------------------------------------------------------------------------
// Firestore — projects
// ---------------------------------------------------------------------------

describe('Firestore: projects', () => {
  async function seedProject(projectId, uId) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'projects', projectId), {
        uId,
        nombre: 'Test project',
        etiqueta: 'WIP',
        fechaCreacion: new Date(),
        deletedAt: null,
      });
    });
  }

  test('unauthenticated cannot read a project', async () => {
    await seedProject('proj1', 'userA');
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'projects', 'proj1')));
  });

  test('user B cannot read user A project', async () => {
    await seedProject('proj1', 'userA');
    const ctxB = testEnv.authenticatedContext('userB');
    await assertFails(getDoc(doc(ctxB.firestore(), 'projects', 'proj1')));
  });

  test('user A can read own project', async () => {
    await seedProject('proj1', 'userA');
    const ctxA = testEnv.authenticatedContext('userA');
    await assertSucceeds(getDoc(doc(ctxA.firestore(), 'projects', 'proj1')));
  });

  test('cannot create project with another user uId', async () => {
    const ctxA = testEnv.authenticatedContext('userA');
    await assertFails(
      setDoc(doc(ctxA.firestore(), 'projects', 'proj2'), {
        uId: 'userB',
        nombre: 'Fake project',
        etiqueta: 'WIP',
        fechaCreacion: new Date(),
        deletedAt: null,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Firestore — diarios and subcollections
// ---------------------------------------------------------------------------

describe('Firestore: diarios and subcollections', () => {
  async function seedDiarioWithEntrada(diarioId, uId) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'diarios', diarioId), {
        uId,
        nombre: 'Test diario',
        fechaCreacion: new Date(),
      });
      await setDoc(doc(ctx.firestore(), 'diarios', diarioId, 'entradas', 'ent1'), {
        nombre: 'Entrada 1',
        elementos: [],
        fechaCreacion: new Date(),
      });
    });
  }

  test('unauthenticated cannot read a diario', async () => {
    await seedDiarioWithEntrada('diario1', 'userA');
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'diarios', 'diario1')));
  });

  test('user A can read own diario entradas subcollection', async () => {
    await seedDiarioWithEntrada('diario1', 'userA');
    const ctxA = testEnv.authenticatedContext('userA');
    await assertSucceeds(getDoc(doc(ctxA.firestore(), 'diarios', 'diario1', 'entradas', 'ent1')));
  });

  test('user B cannot read user A diario entradas subcollection', async () => {
    await seedDiarioWithEntrada('diario1', 'userA');
    const ctxB = testEnv.authenticatedContext('userB');
    await assertFails(getDoc(doc(ctxB.firestore(), 'diarios', 'diario1', 'entradas', 'ent1')));
  });
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

describe('Storage security rules', () => {
  const testPath = 'patrones/userA/proj1/pattern.pdf';
  const testBytes = new Uint8Array([80, 68, 70]); // minimal bytes

  beforeAll(async () => {
    // Seed a file for read tests (bypass rules)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), testPath), testBytes);
    });
  });

  test('unauthenticated cannot read a storage file', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getMetadata(ref(ctx.storage(), testPath)));
  });

  test('user A can read own storage file', async () => {
    const ctxA = testEnv.authenticatedContext('userA');
    await assertSucceeds(getMetadata(ref(ctxA.storage(), testPath)));
  });

  test('user B cannot read user A storage file', async () => {
    const ctxB = testEnv.authenticatedContext('userB');
    await assertFails(getMetadata(ref(ctxB.storage(), testPath)));
  });
});
