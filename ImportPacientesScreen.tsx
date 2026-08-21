import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionLabel } from './ui';
import { colors } from './colors';
import { fonts, type } from './typography';
import { notify } from './notify';
import { supabase } from './supabase';

type FolderStatus = 'pending' | 'processing' | 'done' | 'error';
type PdfFile = { name: string; data: string };
type FolderJob = {
  folder: string;
  files: File[];
  status: FolderStatus;
  message?: string;
  result?: {
    name: string;
    login: string;
    password: string;
    reused: boolean;
    exams_total: number;
    added: number;
    skipped: number;
  };
};

/** Lê um File como base64 puro (sem o prefixo data:...;base64,). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler ' + file.name));
    reader.onload = () => {
      const res = String(reader.result || '');
      const comma = res.indexOf(',');
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.readAsDataURL(file);
  });
}

/** Agrupa os PDFs pela pasta imediata (= paciente), usando webkitRelativePath. */
function groupByFolder(fileList: FileList): FolderJob[] {
  const groups: Record<string, File[]> = {};
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if (!/\.pdf$/i.test(f.name)) continue;
    const rel = (f as any).webkitRelativePath || f.name;
    const parts = String(rel).split('/').filter(Boolean);
    // pasta imediata do arquivo; se veio solto, agrupa em "Sem pasta"
    const folder = parts.length >= 2 ? parts[parts.length - 2] : 'Sem pasta';
    (groups[folder] = groups[folder] || []).push(f);
  }
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b, 'pt'))
    .map((folder) => ({ folder, files: groups[folder], status: 'pending' as FolderStatus }));
}

export function ImportPacientesScreen() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [jobs, setJobs] = useState<FolderJob[]>([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<number>(-1);

  const totalPdfs = useMemo(() => jobs.reduce((s, j) => s + j.files.length, 0), [jobs]);
  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const errCount = jobs.filter((j) => j.status === 'error').length;

  function pickFolders() {
    if (Platform.OS !== 'web') {
      notify('Somente na versão web', 'Abra o VITALITY pelo navegador do computador para importar as pastas.');
      return;
    }
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  function onFiles(e: any) {
    const fl: FileList | null = e?.target?.files || null;
    if (!fl || fl.length === 0) return;
    const grouped = groupByFolder(fl);
    if (grouped.length === 0) {
      notify('Nenhum PDF encontrado', 'Selecione a pasta que contém as bioimpedâncias em PDF.');
      return;
    }
    setJobs(grouped);
    setCurrent(-1);
  }

  function updateJob(idx: number, patch: Partial<FolderJob>) {
    setJobs((arr) => arr.map((j, i) => (i === idx ? { ...j, ...patch } : j)));
  }

  async function runImport() {
    if (running || jobs.length === 0) return;
    setRunning(true);
    for (let i = 0; i < jobs.length; i++) {
      // pula pastas já concluídas (permite re-tentar só as que falharam)
      if (jobs[i].status === 'done') continue;
      setCurrent(i);
      updateJob(i, { status: 'processing', message: 'Lendo os PDFs…' });
      try {
        const files = jobs[i].files;
        const pdfs: PdfFile[] = [];
        for (const f of files) {
          const data = await fileToBase64(f);
          pdfs.push({ name: f.name, data });
        }
        updateJob(i, { message: 'A IA está lendo as bioimpedâncias…' });
        const { data, error } = await supabase.functions.invoke('import-bioimpedance', {
          body: { folder: jobs[i].folder, pdfs },
        });
        if (error) {
          let msg = error.message || 'Erro na importação.';
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              if (body?.error) msg = body.error;
            }
          } catch {}
          updateJob(i, { status: 'error', message: msg });
          continue;
        }
        if (data?.error) {
          updateJob(i, { status: 'error', message: data.error });
          continue;
        }
        updateJob(i, {
          status: 'done',
          message: undefined,
          result: {
            name: data.name,
            login: data.login,
            password: data.password,
            reused: !!data.reused,
            exams_total: data.exams_total ?? 0,
            added: data.added ?? 0,
            skipped: data.skipped ?? 0,
          },
        });
      } catch (e: any) {
        updateJob(i, { status: 'error', message: e?.message || 'Erro inesperado.' });
      }
    }
    setCurrent(-1);
    setRunning(false);
  }

  function clearAll() {
    if (running) return;
    setJobs([]);
    setCurrent(-1);
  }

  return (
    <Screen>
      {/* input nativo do navegador — pasta inteira (com subpastas) */}
      {Platform.OS === 'web' && (
        // @ts-ignore — elemento web dentro do RN Web
        <input
          ref={inputRef as any}
          type="file"
          multiple
          // @ts-ignore atributos não-padrão para seleção de pasta
          webkitdirectory=""
          directory=""
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={onFiles}
        />
      )}

      <View style={styles.header}>
        <Text style={styles.eyebrow}>ADMINISTRAÇÃO</Text>
        <Text style={styles.h1}>Importar pacientes</Text>
        <Text style={styles.sub}>
          Selecione a pasta com as bioimpedâncias (PDF). Cada subpasta é um paciente. A IA lê os
          laudos e alimenta a evolução — peso, composição corporal e TMB — automaticamente.
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={pickFolders} disabled={running} style={[styles.btn, styles.btnPrimary, running && styles.btnOff]}>
          <Ionicons name="folder-open" size={18} color={colors.textOnGold} />
          <Text style={styles.btnPrimaryTxt}>Selecionar pasta</Text>
        </Pressable>
        {jobs.length > 0 && !running && (
          <Pressable onPress={clearAll} style={[styles.btn, styles.btnGhost]}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
            <Text style={styles.btnGhostTxt}>Limpar</Text>
          </Pressable>
        )}
      </View>

      {jobs.length > 0 && (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryNum}>{jobs.length}</Text>
              <Text style={styles.summaryLbl}>pastas</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryNum}>{totalPdfs}</Text>
              <Text style={styles.summaryLbl}>PDFs</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryNum, { color: colors.success }]}>{doneCount}</Text>
              <Text style={styles.summaryLbl}>prontos</Text>
            </View>
            {errCount > 0 && (
              <View style={styles.summaryChip}>
                <Text style={[styles.summaryNum, { color: colors.danger }]}>{errCount}</Text>
                <Text style={styles.summaryLbl}>com erro</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={runImport}
            disabled={running}
            style={[styles.importBtn, running && styles.btnOff]}
          >
            {running ? (
              <>
                <ActivityIndicator color={colors.textOnGold} />
                <Text style={styles.importTxt}>
                  Importando… {current >= 0 ? `(${current + 1}/${jobs.length})` : ''}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color={colors.textOnGold} />
                <Text style={styles.importTxt}>
                  {errCount > 0 || doneCount > 0 ? 'Continuar importação' : 'Importar tudo'}
                </Text>
              </>
            )}
          </Pressable>

          <SectionLabel style={{ marginTop: 8 }}>Pastas detectadas</SectionLabel>
          <ScrollView>
            {jobs.map((j, i) => (
              <Card key={j.folder + i} style={styles.jobCard}>
                <View style={styles.jobHead}>
                  <View style={[styles.statusDot, statusStyle(j.status)]}>
                    {j.status === 'processing' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name={statusIcon(j.status)} size={16} color="#fff" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobFolder}>{j.folder}</Text>
                    <Text style={styles.jobSub}>
                      {j.files.length} {j.files.length === 1 ? 'PDF' : 'PDFs'}
                      {j.result ? ` · ${j.result.name}` : ''}
                    </Text>
                  </View>
                </View>

                {j.status === 'processing' && j.message && (
                  <Text style={styles.processing}>{j.message}</Text>
                )}

                {j.status === 'error' && (
                  <View style={styles.errBox}>
                    <Ionicons name="alert-circle" size={14} color={colors.danger} />
                    <Text style={styles.errTxt}>{j.message}</Text>
                  </View>
                )}

                {j.status === 'done' && j.result && (
                  <View style={styles.resultBox}>
                    <View style={styles.credRow}>
                      <View style={styles.credCol}>
                        <Text style={styles.credLbl}>LOGIN</Text>
                        <Text style={styles.credVal}>{j.result.login}</Text>
                      </View>
                      <View style={styles.credCol}>
                        <Text style={styles.credLbl}>SENHA (nascimento)</Text>
                        <Text style={styles.credVal}>{j.result.password}</Text>
                      </View>
                    </View>
                    <Text style={styles.resultLine}>
                      {j.result.reused ? 'Paciente já existia · ' : 'Acesso criado · '}
                      {j.result.added > 0
                        ? `${j.result.added} nova(s) bioimpedância(s) adicionada(s)`
                        : 'nenhuma bioimpedância nova'}
                      {j.result.skipped > 0 ? ` · ${j.result.skipped} já estava(m) no sistema` : ''}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </ScrollView>
        </>
      )}

      {jobs.length === 0 && (
        <Card style={{ marginTop: 12 }}>
          <View style={styles.emptyRow}>
            <Ionicons name="information-circle" size={20} color={colors.gold} />
            <Text style={styles.emptyTxt}>
              O login de cada paciente é o primeiro nome e a senha é a data de nascimento
              (DDMMAAAA). No primeiro acesso, o paciente troca a senha. Você pode reimportar a
              qualquer momento — apenas as bioimpedâncias novas são adicionadas.
            </Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

function statusIcon(s: FolderStatus): keyof typeof Ionicons.glyphMap {
  if (s === 'done') return 'checkmark';
  if (s === 'error') return 'close';
  return 'ellipse-outline';
}
function statusStyle(s: FolderStatus) {
  if (s === 'done') return { backgroundColor: colors.success };
  if (s === 'error') return { backgroundColor: colors.danger };
  if (s === 'processing') return { backgroundColor: colors.gold };
  return { backgroundColor: colors.textMuted };
}

const styles = StyleSheet.create({
  header: { marginBottom: 14 },
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.gold, letterSpacing: 2, textTransform: 'uppercase' },
  h1: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.textPrimary, marginTop: 2 },
  sub: { ...type.small, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  btnPrimary: { backgroundColor: colors.gold },
  btnPrimaryTxt: { fontFamily: fonts.sansSemibold, fontSize: 14, color: colors.textOnGold },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnGhostTxt: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.textSecondary },
  btnOff: { opacity: 0.5 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryChip: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 10 },
  summaryNum: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.textPrimary },
  summaryLbl: { ...type.small, color: colors.textSecondary },

  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.navy, paddingVertical: 14, borderRadius: 14, marginBottom: 6 },
  importTxt: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.textOnGold },

  jobCard: { marginBottom: 10 },
  jobHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  jobFolder: { ...type.cardTitle, color: colors.textPrimary },
  jobSub: { ...type.small, color: colors.textSecondary, marginTop: 1 },

  processing: { ...type.small, color: colors.gold, marginTop: 10, fontStyle: 'italic' },

  errBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, backgroundColor: colors.danger + '14', borderRadius: 10, padding: 10 },
  errTxt: { ...type.small, color: colors.danger, flex: 1 },

  resultBox: { marginTop: 10, backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 12 },
  credRow: { flexDirection: 'row', gap: 12 },
  credCol: { flex: 1 },
  credLbl: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 1 },
  credVal: { fontFamily: fonts.sansSemibold, fontSize: 16, color: colors.textPrimary, marginTop: 2 },
  resultLine: { ...type.small, color: colors.textSecondary, marginTop: 10 },

  emptyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  emptyTxt: { ...type.small, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});
