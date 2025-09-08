
'use server';

/**
 * @fileOverview A Genkit flow for securely deleting a user and their associated data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

// Define input schema for the flow
const DeleteUserInputSchema = z.object({
  userIdToDelete: z.string().describe('The UID of the user to be deleted.'),
  adminUid: z.string().describe('The UID of the admin performing the action.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

const DeleteUserOutputSchema = z.object({
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;


// Helper function to initialize Firebase Admin SDK
function initializeAdminApp() {
  const appName = 'firebase-admin-delete-user-flow';
  const existingApp = admin.apps.find(app => app?.name === appName);
  if (existingApp) {
    return existingApp;
  }
  
  // This will use the default service account credentials from the environment
  return admin.initializeApp({}, appName);
}


// Recursive function to delete subcollections
async function deleteSubcollections(db: admin.firestore.Firestore, docPath: string) {
    const docRef = db.doc(docPath);
    const collections = await docRef.listCollections();
    for (const collection of collections) {
      const query = collection.limit(100);
      let snapshot = await query.get();
      while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        snapshot = await query.get();
      }
    }
  }

// Define the main exported function that calls the flow
export async function deleteUser(input: DeleteUserInput): Promise<DeleteUserOutput> {
  return deleteUserFlow(input);
}


// Define the Genkit flow
const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async (input) => {
    try {
        const adminApp = initializeAdminApp();
        const db = admin.firestore(adminApp);
        const auth = admin.auth(adminApp);

        // 1. Verify that the user performing the action is an admin
        const adminUser = await auth.getUser(input.adminUid);
        if (adminUser.customClaims?.['role'] !== 'admin') {
            throw new Error('Permission denied: You must be an admin to perform this action.');
        }

        const userId = input.userIdToDelete;

        // 2. Delete all user data from Firestore
        const userDocRef = db.doc(`users/${userId}`);

        // a. Delete subcollections
        await deleteSubcollections(db, `users/${userId}`);

        // b. Delete main user document
        await userDocRef.delete();
        
        // c. Delete payment document
        const paymentDocRef = db.doc(`payments/${userId}`);
        await paymentDocRef.delete().catch(() => {}); // Ignore error if it doesn't exist
        
        // d. Delete review document(s)
        const reviewsRef = db.collection('reviews');
        const reviewQuery = reviewsRef.where('userId', '==', userId);
        const reviewSnapshot = await reviewQuery.get();
        if (!reviewSnapshot.empty) {
            const batch = db.batch();
            reviewSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 3. Delete the user from Firebase Authentication
        await auth.deleteUser(userId);

        return { message: `Successfully deleted user ${userId} and all their data.` };
    } catch (error: any) {
        console.error(`Failed to delete user ${input.userIdToDelete}:`, error);

        if (error.code === 'auth/user-not-found') {
            throw new Error('The user to delete was not found in Firebase Authentication.');
        }
        if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
            throw new Error('Permission denied. The server does not have the required permissions.');
        }

        throw new Error(error.message || 'An internal error occurred while deleting the user.');
    }
  }
);
