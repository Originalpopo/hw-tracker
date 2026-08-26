import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

const COLLECTIONS = ["hw_child_tasks", "hw_teacher_columns", "app_settings"];

async function runBackup() {
  console.log("🚀 Starting Firestore Backup for HW Tracker...");
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  
  const backupData = {
    metadata: {
      timestamp: now.toISOString(),
      projectId: firebaseConfig.projectId,
      totalCollections: COLLECTIONS.length,
      counts: {}
    },
    data: {}
  };

  for (const colName of COLLECTIONS) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docs = [];
      snapshot.forEach(docSnap => {
        docs.push({
          _id: docSnap.id,
          ...docSnap.data()
        });
      });
      backupData.data[colName] = docs;
      backupData.metadata.counts[colName] = docs.length;
      console.log(`✅ [${colName}]: Backed up ${docs.length} documents.`);
    } catch (err) {
      console.error(`❌ Error backing up collection ${colName}:`, err);
      backupData.data[colName] = [];
      backupData.metadata.counts[colName] = 0;
    }
  }

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Timestamped backup file
  const filename = `backup-firestore-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), "utf-8");

  // 2. Also keep a latest.json for convenience
  const latestPath = path.join(backupDir, "backup-firestore-latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2), "utf-8");

  console.log("\n🎉 Backup completed successfully!");
  console.log(`📁 File saved to: ${filepath}`);
  console.log(`📁 Latest shortcut: ${latestPath}`);
  console.log("\nSummary of records backed up:");
  console.table(backupData.metadata.counts);
}

runBackup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal backup error:", err);
    process.exit(1);
  });
