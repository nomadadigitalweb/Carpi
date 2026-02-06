import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// NOTA: Este script requiere que las variables de entorno estén configuradas
// o pasadas como argumentos si se corre localmente con ts-node.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function loadEnv() {
    if (supabaseUrl && supabaseAnonKey) return;
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    } catch (e) {
        console.warn('No se pudo cargar .env.local');
    }
}

loadEnv();

const finalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const finalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!finalUrl || !finalKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas.');
    process.exit(1);
}

const supabase = createClient(finalUrl, finalKey);

async function migrate() {
    console.log('Iniciando migración de productos...');

    try {
        const rawData = fs.readFileSync('products_legacy.json', 'utf8');
        const legacyProducts = JSON.parse(rawData);

        console.log(`Encontrados ${legacyProducts.length} productos para migrar.`);

        for (const lp of legacyProducts) {
            const now = new Date().toISOString();
            const productData: any = {
                name: lp.name?.trim() || 'Producto sin nombre',
                description: lp.line?.properties?.replace(/<[^>]*>?/gm, '') || lp.description || '',
                image_url: lp.primaryImage || (lp.images && lp.images[0]?.url_image) || lp.image || '',
                price: lp.publicPrice || lp.price || 0,
                stock: lp.stock || 0,
                category: lp.line?.name || lp.category || 'General',
                created_at: now,
                updated_at: now
            };

            const extraData = {
                sku: lp.sku,
                line_id: lp.line?.id,
                is_ars: lp.isArs,
                original_id: lp.id
            };

            // Buscar si ya existe por nombre para evitar errores de ON CONFLICT si no hay índice único
            const { data: existingProduct } = await supabase
                .from('products')
                .select('id')
                .eq('name', productData.name)
                .maybeSingle();

            let error;
            if (existingProduct) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ ...productData, extra: extraData })
                    .eq('id', existingProduct.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('products')
                    .insert([{
                        ...productData,
                        id: crypto.randomUUID(),
                        extra: extraData
                    }]);
                error = insertError;
            }

            if (error) {
                console.error(`Error migrando producto ${productData.name}:`, error.message);
            } else {
                console.log(`Producto migrado/actualizado: ${productData.name}`);
            }
        }

        console.log('Migración completada con éxito.');
    } catch (error) {
        console.error('Error durante la migración:', error);
    }
}

migrate();
