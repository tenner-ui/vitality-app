/**
 * Configuração de ambiente do VITALITY.
 * As chaves abaixo são as do projeto Supabase do Instituto Vitality.
 * A chave "anon/publishable" é pública por design (protegida por RLS no banco).
 * NUNCA coloque a service_role key aqui — ela ignora o RLS.
 */
export const SUPABASE_URL = 'https://ijenwxlqbmngnnrdkdxj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_90NtDbh-Ws0uy8w4r4IBPQ_-ZMYE6JU';

/** Marca */
export const BRAND = {
  appName: 'VITALITY',
  institute: 'Instituto Vitality',
  doctor: 'Dr. Tenner Nunes',
  program: 'RenovaCorps',
};

/**
 * Redes sociais do Dr. Tenner (aba "Redes").
 * Ajuste os links/handles aqui — é só trocar a URL de cada item.
 */
export const SOCIALS: { label: string; handle: string; url: string; icon: string; color: string }[] = [
  { label: 'Instagram — Dr. Tenner', handle: '@drtennernunes', url: 'https://instagram.com/drtennernunes', icon: 'logo-instagram', color: '#E1306C' },
  { label: 'Instagram — Instituto', handle: '@instituto.vitality', url: 'https://instagram.com/instituto.vitality', icon: 'logo-instagram', color: '#C8A24A' },
  { label: 'WhatsApp do Instituto', handle: 'Falar no WhatsApp', url: 'https://wa.me/5500000000000', icon: 'logo-whatsapp', color: '#25D366' },
  { label: 'YouTube', handle: 'Canal do Dr. Tenner', url: 'https://youtube.com/@drtennernunes', icon: 'logo-youtube', color: '#FF0000' },
];
