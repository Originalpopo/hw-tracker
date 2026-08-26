import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDX7hKZ3ZQP_hKFviv688hcckQl51zLkXk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "homework-tracker-app-a4203.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "homework-tracker-app-a4203",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "homework-tracker-app-a4203.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "909784633759",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:909784633759:web:0b2d3723a6dbb8b30d2daa",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function runRestore() {
  const targetArg = process.argv[2];
  const backupDir = path.join(process.cwd(), "backups");
  
  let targetFile = targetArg;
  if (!targetFile) {
    targetFile = path.join(backupDir, "backup-firestore-latest.json");
  } else if (!path.isAbsolute(targetFile)) {
    targetFile = path.join(backupDir, targetFile);
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`❌ Backup file not found: ${targetFile}`);
    process.exit(1);
  }

  console.log(`🚀 Starting Firestore Restore from: ${targetFile}`);
  const rawData = fs.readFileSync(targetFile, "utf-8");
  const backup = JSON.parse(rawData);

  console.log(`📅 Backup Timestamp: ${backup.metadata?.timestamp || "Unknown"}`);
  console.log(`📦 Project ID: ${backup.metadata?.projectId || "Unknown"}`);

  for (const [colName, docs] of Object.entries(backup.data || {})) {
    console.log(`\n⏳ Restoring [${colName}] (${docs.length} records)...`);
    let count = 0;
    for (const docObj of docs) {
      const { _id, ...cleanData } = docObj;
      if (!_id) continue;
      const docRef = doc(db, colName, _id);
      await setDoc(docRef, cleanData, { merge: true });
      count++;
    }
    console.log(`✅ [${colName}]: Successfully restored ${count} documents.`);
  }

  console.log("\n🎉 Full Firestore Restore Completed Successfully!");
}

runRestore()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal restore error:", err);
    process.exit(1);
  });
