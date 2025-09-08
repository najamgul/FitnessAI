
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

async function deleteSubcollections(docPath: string) {
  const docRef = admin.firestore().doc(docPath);
  const collections = await docRef.listCollections();
  for (const collection of collections) {
    const query = collection.limit(100);
    let snapshot = await query.get();
    while (snapshot.size > 0) {
      const batch = admin.firestore().batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      snapshot = await query.get();
    }
  }
}

export const deleteUser = onCall(async (request) => {
  if (request.auth?.token.role !== 'admin') {
    logger.error("Unauthorized attempt to delete user by", request.auth?.token.uid);
    throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
  }

  const userId = request.data.userId;
  if (!userId || typeof userId !== 'string') {
    logger.error("Invalid userId provided for deletion:", userId);
    throw new HttpsError('invalid-argument', 'The function must be called with a valid "userId" argument.');
  }

  logger.info(`Admin ${request.auth?.token.uid} is deleting user ${userId}`);

  try {
    const db = admin.firestore();
    const userDocRef = db.doc(`users/${userId}`);

    // --- Firestore Data Deletion ---
    // 1. Delete subcollections first
    await deleteSubcollections(`users/${userId}`);
    logger.info(`Subcollections for user ${userId} deleted.`);

    // 2. Delete main user document
    await userDocRef.delete();
    logger.info(`Firestore document for user ${userId} deleted.`);

    // 3. Delete related payment document
    const paymentDocRef = db.doc(`payments/${userId}`);
    await paymentDocRef.delete().catch(() => logger.warn(`No payment doc to delete for ${userId}`));
    logger.info(`Payment document for user ${userId} deleted.`);
    
    // 4. Delete related review document
    const reviewsRef = db.collection('reviews');
    const reviewQuery = reviewsRef.where('userId', '==', userId);
    const reviewSnapshot = await reviewQuery.get();
    if (!reviewSnapshot.empty) {
        const batch = db.batch();
        reviewSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        logger.info(`Review document(s) for user ${userId} deleted.`);
    }

    // --- Firebase Auth User Deletion ---
    await admin.auth().deleteUser(userId);
    logger.info(`Successfully deleted user ${userId} from Firebase Auth.`);

    return { message: `Successfully deleted user ${userId} and all their data.` };

  } catch (error: any) {
    logger.error(`Failed to delete user ${userId}:`, error);

    // Provide a more specific error message to the client
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'The user to delete was not found in Firebase Authentication.');
    }
    if (error.code === 'permission-denied') {
        throw new HttpsError('permission-denied', 'The server does not have permission to delete the user. Check IAM roles.');
    }
    
    throw new HttpsError('internal', 'An internal error occurred while deleting the user.', error.message);
  }
});
