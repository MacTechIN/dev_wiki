import {openDb} from './db.mjs';
import {classifySubmission} from './classifier.mjs';

const db = openDb();
const pending = db.prepare(`
  SELECT id FROM submissions WHERE status IN ('submitted', 'needs_reclassify')
`).all();

for (const row of pending) {
  console.log(`classifying ${row.id}`);
  classifySubmission(db, row.id);
}

console.log(`processed ${pending.length} submissions`);
