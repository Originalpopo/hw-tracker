import { db } from './src/lib/firebase';
import { getGlobalSettings } from './src/lib/db';

async function test() {
  const settings = await getGlobalSettings();
  console.log("Global Settings:", settings);
}

test().catch(console.error);
