const functions = require('firebase-functions');
const admin     = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const RECIPIENT = 'jason.persinger@gmail.com';

exports.dailyFollowupEmail = functions.pubsub
  .schedule('0 13 * * *')          // 8:00 AM Eastern (UTC-5 = 13:00 UTC)
  .timeZone('America/New_York')
  .onRun(async () => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const usersSnap = await db.collection('users').get();
    let dueFollowups = [];

    for (const userDoc of usersSnap.docs) {
      const fuDoc = await db
        .collection('users').doc(userDoc.id)
        .collection('data').doc('pp_followups')
        .get();
      if (!fuDoc.exists) continue;
      const followups = fuDoc.data().value || [];
      const due = followups.filter(f => f.dueDate === today && !f.done);
      dueFollowups = dueFollowups.concat(due);
    }

    if (dueFollowups.length === 0) {
      console.log('No follow-ups due today.');
      return null;
    }

    const count = dueFollowups.length;
    const list  = dueFollowups.map(f =>
      `• ${f.customerName} — ${f.phone || 'no phone'}\n  ${f.note}`
    ).join('\n\n');

    await db.collection('mail').add({
      to: RECIPIENT,
      message: {
        subject: `Pixel Patcher — ${count} follow-up${count > 1 ? 's' : ''} due today`,
        text:    `Good morning! You have ${count} follow-up${count > 1 ? 's' : ''} due today:\n\n${list}\n\n— Pixel Patcher`,
      },
    });

    console.log(`Sent follow-up email for ${count} item(s).`);
    return null;
  });

// ── Intake form → job creation ─────────────────────────────────────────────
const OWNER_UID     = '68lCW8VoqIXBsgDy7QYMrcZnDjh2';
const INTAKE_SECRET = 'pp-intake-2026';

exports.createJobFromIntake = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST')   { res.status(405).send('Method Not Allowed'); return; }

  // Verify shared secret
  if (req.query.secret !== INTAKE_SECRET) {
    res.status(403).send('Forbidden');
    return;
  }

  // Netlify sends form data under req.body.data
  const data    = req.body.data || req.body || {};
  const name    = (data.name    || '').trim();
  const phone   = (data.phone   || '').trim();
  const message = (data.message || '').trim();

  if (!name || !phone) {
    res.status(400).json({ error: 'Missing name or phone' });
    return;
  }

  // Generate a simple unique ID
  const newId = db.collection('tmp').doc().id;
  const today = new Date().toISOString().slice(0, 10);

  // Read existing jobs
  const jobsRef = db.collection('users').doc(OWNER_UID).collection('data').doc('pp_jobs');
  const jobsDoc = await jobsRef.get();
  const jobs    = (jobsDoc.exists ? jobsDoc.data().value : null) || [];

  // Append new pending job
  jobs.push({
    id: newId, date: today,
    customer: name, customerId: null,
    phone, address: '', issue: message,
    service: '', labor: 0, parts: 0, tax: 0,
    status: 'Pending', paid: false,
  });

  await jobsRef.set({ value: jobs });

  // Send notification email
  await db.collection('mail').add({
    to: RECIPIENT,
    message: {
      subject: `Pixel Patcher — New website inquiry from ${name}`,
      text: `New repair request from your website:\n\nName: ${name}\nPhone: ${phone}\n\nMessage:\n${message}\n\nThis job has been added to your accounting app as "Pending".\n\nOpen app: https://pixelpatcher-accounting.web.app/PIXELPATCHER-Accounting.html\n\n— Pixel Patcher`,
    },
  });

  res.json({ success: true });
});
