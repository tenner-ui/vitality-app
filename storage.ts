/**
 * Upload de arquivos para o Supabase Storage (buckets privados).
 * Convenção de caminho: "<patient_id>/<timestamp>.<ext>".
 * Acesso controlado por RLS em storage.objects (paciente na própria pasta; equipe em todas).
 */
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase, supabaseConfigured } from './supabase';

export type Bucket = 'exams' | 'body-photos' | 'avatars' | 'cardio' | 'meal-photos' | 'bioimpedance' | 'community';

function extFrom(uri: string, mime?: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('heic')) return 'heic';
  const u = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (u === 'png' || u === 'webp' || u === 'heic') return u;
  return 'jpg';
}

export async function pickAndUpload(
  bucket: Bucket,
  patientId: string | null,
  demo: boolean
): Promise<{ path?: string; error?: string; canceled?: boolean }> {
  if (!supabaseConfigured || demo || !patientId || patientId === 'demo') {
    return { error: 'Disponível apenas em conta real (não no modo demonstração).' };
  }

  // Na web não precisamos de permissão de galeria (abre o seletor de arquivos do navegador,
  // que no celular também permite tirar foto na hora). No nativo, pedimos permissão.
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { error: 'Permissão de galeria negada.' };
  }

  let res: ImagePicker.ImagePickerResult;
  try {
    res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: Platform.OS !== 'web',
    });
  } catch (e: any) {
    return { error: 'Não foi possível abrir a galeria: ' + (e?.message || 'erro') };
  }
  if (res.canceled || !res.assets?.length) return { canceled: true };

  const asset = res.assets[0];
  const ext = extFrom(asset.uri, (asset as any).mimeType);
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const path = `${patientId}/${Date.now()}.${ext}`;

  try {
    let body: Blob | ArrayBuffer;
    if (Platform.OS === 'web') {
      // asset.uri é um blob:/data: URL — buscamos o binário direto.
      const resp = await fetch(asset.uri);
      body = await resp.blob();
    } else {
      const b64 =
        (asset as any).base64 ??
        (await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }));
      body = decode(b64);
    }
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, body as any, { contentType, upsert: true });
    if (error) return { error: error.message };
    return { path };
  } catch (e: any) {
    return { error: 'Falha ao enviar a imagem: ' + (e?.message || 'erro') };
  }
}

/** URL assinada temporária (1h) para exibir um arquivo privado. */
export async function signedUrl(bucket: Bucket, path: string): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** URL pública permanente (buckets públicos: avatars, community). */
export function publicUrl(bucket: Bucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
