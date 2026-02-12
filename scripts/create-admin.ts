import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Cargar variables de entorno
const envContent = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// NOTA: Para cambiar el rol, necesitarías la SERVICE_ROLE_KEY o hacerlo vía SQL Editor.
// Este script crea el usuario. Luego debes ejecutar el UPDATE en el SQL Editor de Supabase.

async function createAdmin() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const email = 'admin@carpi.com'; // Puedes cambiar esto
    const password = 'NuevaPassword123!';

    console.log(`Intentando crear usuario: ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Administrador Carpi',
            }
        }
    });

    if (error) {
        console.error('Error al crear usuario:', error.message);
    } else {
        console.log('Usuario creado exitosamente.');
        console.log('ID del usuario:', data.user?.id);
        console.log('\n--- IMPORTANTE ---');
        console.log('Ahora debes ir al SQL Editor de Supabase y ejecutar:');
        console.log(`UPDATE public.profiles SET role = 'admin' WHERE id = '${data.user?.id}';`);
    }
}

createAdmin();
