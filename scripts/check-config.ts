// Validates every creator config (or only CREATOR_SLUG if set). Used in CI and before deploys.
import { creatorInputs, loadCreator } from '../creators';

const slugs = process.env.CREATOR_SLUG ? [process.env.CREATOR_SLUG] : Object.keys(creatorInputs);
let failed = false;
for (const slug of slugs) {
  try {
    const { creator } = loadCreator(slug);
    console.log(`✓ ${slug}: ${creator.identity.appName} — ${creator.programs.length} programs, ${creator.quiz.questions.length} quiz questions`);
  } catch (e) {
    failed = true;
    console.error(`✗ ${(e as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
