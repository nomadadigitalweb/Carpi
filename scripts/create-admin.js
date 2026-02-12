const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
        }
    });

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('No se encontraron las variables de Supabase en .env.local');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    async function createAdmin() {
        const email = 'admin@carpi.com';
        const password = 'NuevaPassword123!'; // Cambia esto si quieres

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
            if (error.message.includes('already registered')) {
                console.log('\nEl usuario ya existe. Solo necesitas ejecutar el SQL para hacerlo admin.');
            }
        } else {
            console.log('\n✅ Usuario creado exitosamente.');
            console.log('ID del usuario:', data.user?.id);
            console.log('\n--- PASO FINAL (SQL) ---');
            console.log('Copia y pega esto en el SQL Editor de Supabase:');
            console.log(`UPDATE public.profiles SET role = 'admin' WHERE id = '${data.user?.id}';`);
        }
    }

    createAdmin();

} catch (err) {
    console.error('Error al leer .env.local:', err.message);
}
