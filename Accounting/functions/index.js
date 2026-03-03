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
