require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  const { data: actors, error: aErr } = await supabase
    .from('profiles')
    .select('id,role,is_active,email')
    .in('role', ['admin_carpi', 'gestor_financiero', 'encargado_ventas', 'fabricante', 'usuario'])
    .limit(1);

  if (aErr) throw aErr;

  const actor = actors?.[0] ?? null;

  const { data: anyPriceRow, error: anyPriceErr } = await supabase
    .from('product_prices')
    .select('lista_precio_id')
    .limit(1)
    .single();

  if (anyPriceErr && !actor) throw anyPriceErr;

  let listaId = anyPriceRow?.lista_precio_id ?? null;
  let lines = [];

  if (listaId) {
    const { data: priceRows, error: pErr } = await supabase
      .from('product_prices')
      .select('product_id,price')
      .eq('lista_precio_id', listaId)
      .order('price', { ascending: false })
      .limit(3);

    if (pErr) throw pErr;

    if (priceRows && priceRows.length > 0) {
      const productIds = priceRows.map((row) => row.product_id);
      const { data: products, error: prErr } = await supabase
        .from('products')
        .select('id,name,sku')
        .in('id', productIds);

      if (prErr) throw prErr;

      const productMap = new Map((products || []).map((product) => [product.id, product]));
      lines = priceRows.map((row, index) => ({
        product_id: row.product_id,
        product_name: productMap.get(row.product_id)?.name || 'Producto demo',
        sku: productMap.get(row.product_id)?.sku || null,
        quantity: index === 0 ? 2 : 1,
        unit_price: Number(row.price || 0),
      }));
    }
  }

  if (lines.length === 0) {
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id,name,sku,price')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (pErr) throw pErr;
    if (!products || products.length === 0) throw new Error('No hay productos para crear pedido demo');

    lines = products.map((product, index) => ({
      product_id: product.id,
      product_name: product.name || 'Producto demo',
      sku: product.sku || null,
      quantity: index === 0 ? 2 : 1,
      unit_price: Number(product.price || 0),
    }));
  }

  const total = lines.reduce((acc, line) => acc + line.quantity * line.unit_price, 0);

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      user_id: actor?.id ?? null,
      fabricante_id: actor?.id ?? null,
      user_email: actor?.email ?? 'cliente.demo@carpi.test',
      total,
      status: 'pendiente_fabricante',
      status_pago: 'transfer_waiting',
      status_envio: 'preparando',
      notes: 'TEST DEMO - Pedido de prueba para mostrar funcionamiento al cliente',
    })
    .select('id,created_at,status,total,user_id,fabricante_id')
    .single();

  if (oErr) throw oErr;

  const { error: iErr } = await supabase
    .from('order_items')
    .insert(lines.map((line) => ({ ...line, order_id: order.id })));

  if (iErr) throw iErr;

  console.log(JSON.stringify({
    ok: true,
    order,
    actor_email: actor?.email ?? null,
    lista_precio_id: listaId,
    items: lines.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
