import { createClerkClient } from '@clerk/backend';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function createTestUser() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Uso: npx tsx scripts/create-test-user.ts <email> <password>');
        process.exit(1);
    }

    const [email, password] = args;

    try {
        console.log(`Buscando si el usuario ${email} ya existe...`);
        const existingUsers = await clerkClient.users.getUserList({
            emailAddress: [email],
        });

        if (existingUsers.data.length > 0) {
            const existingUser = existingUsers.data[0];
            console.log(`Usuario existente encontrado (ID: ${existingUser.id}). Eliminando para crear uno nuevo verificado...`);
            await clerkClient.users.deleteUser(existingUser.id);
            console.log('✅ Usuario previo eliminado.');
        }

        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);
        console.log(`Creando nuevo usuario: ${email} (username: ${username})...`);
        const user = await clerkClient.users.createUser({
            emailAddress: [email],
            password: password,
            username: username,
            firstName: 'Test',
            lastName: 'User',
            skipPasswordChecks: true,
        });

        console.log(`✅ ID: ${user.id}`);

        if (user.emailAddresses && user.emailAddresses.length > 0) {
            const emailId = user.emailAddresses[0].id;
            await clerkClient.emailAddresses.updateEmailAddress(emailId, {
                verified: true,
            });
            console.log('✅ Verificado.');
        }

        console.log(`✅ Todo listo para: ${email}`);
    } catch (error: any) {
        console.error('❌ ERROR CLERK:');
        if (error.status) console.error('Status:', error.status);
        if (error.errors && error.errors.length > 0) {
            error.errors.forEach((e: any, i: number) => {
                console.error(`Error ${i + 1}:`, e.message, '| Code:', e.code, '| Meta:', JSON.stringify(e.meta));
            });
        } else {
            console.error(error.message || error);
        }
        process.exit(1);
    }
}

createTestUser();
