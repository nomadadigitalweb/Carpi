import { createClerkClient } from '@clerk/backend';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function setUserRole() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Uso: npx tsx scripts/set-user-role.ts <email_o_id> <rol>');
        console.error('Ejemplo: npx tsx scripts/set-user-role.ts admin@test.com admin');
        process.exit(1);
    }

    const [identifier, role] = args;

    try {
        console.log(`Buscando usuario: ${identifier}...`);

        let user;
        if (identifier.includes('@')) {
            const users = await clerkClient.users.getUserList({
                emailAddress: [identifier],
            });
            user = users.data[0];
        } else {
            user = await clerkClient.users.getUser(identifier);
        }

        if (!user) {
            console.error('Error: Usuario no encontrado.');
            process.exit(1);
        }

        console.log(`Asignando rol "${role}" al usuario ${user.id} (${identifier})...`);

        await clerkClient.users.updateUser(user.id, {
            publicMetadata: {
                role: role,
            },
        });

        console.log('✅ Rol asignado exitosamente.');
        console.log('Recuerda que el usuario debe cerrar y volver a iniciar sesión (o esperar a que el token expire) para ver los cambios.');
    } catch (error: any) {
        console.error('❌ Error al asignar el rol:', error.message);
        process.exit(1);
    }
}

setUserRole();
