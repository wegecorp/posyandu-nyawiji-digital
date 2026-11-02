import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/api-auth';
import { validateBirthDate, validatePhone, validateTextLength } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  const cookieHeader = req.headers.get('cookie') || '';
  const userAgent = req.headers.get('user-agent') || '';

  return NextResponse.json({
    success: true,
    diagnostics: {
      timestamp: new Date().toISOString(),
      userAgent,
      isGSA: /GSA\//i.test(userAgent),
      isInApp: /WhatsApp|FBAN|FBAV|Instagram|Line|ByteLocale|TikTok|GSA\//i.test(userAgent),
      cookiesPresent: Boolean(cookieHeader),
      session: session
        ? {
            userId: session.userId,
            username: session.username,
            name: session.name,
            role: session.role,
            posyanduId: session.posyanduId || null,
          }
        : null,
    },
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const session = await getAuthSession(req);
  const userAgent = req.headers.get('user-agent') || '';
  const cookieHeader = req.headers.get('cookie') || '';

  try {
    const body = await req.json();
    const { name, birthDate, gender, posyanduId, isPregnant, dryRun = true, mockKader = false } = body;

    const validationSteps: Record<string, { status: 'PASS' | 'FAIL'; detail?: string }> = {};

    let effectiveSession = session;
    if (!effectiveSession && mockKader && dryRun) {
      const samplePos = await prisma.posyandu.findFirst({ select: { id: true, name: true } });
      if (samplePos) {
        effectiveSession = {
          userId: 'dev-mock-kader',
          username: 'kader_simulasi_dev',
          name: 'Kader Simulasi Dev',
          role: 'POSYANDU',
          posyanduId: samplePos.id,
        };
        validationSteps.session = {
          status: 'PASS',
          detail: `[SIMULASI DEV] Menggunakan posyandu dummy: ${samplePos.name}`,
        };
      }
    }

    // 1. Session check
    if (!effectiveSession) {
      validationSteps.session = { status: 'FAIL', detail: 'Sesi cookie tidak ditemukan atau kedaluwarsa' };
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak terautentikasi (401)',
          steps: validationSteps,
          diagnostics: { userAgent, cookiesPresent: Boolean(cookieHeader), latencyMs: Date.now() - startedAt },
        },
        { status: 401 }
      );
    }
    if (!validationSteps.session) {
      validationSteps.session = { status: 'PASS', detail: `Role: ${effectiveSession.role}, User: ${effectiveSession.username}` };
    }

    // 2. Role check
    if (effectiveSession.role !== 'POSYANDU') {
      validationSteps.role = {
        status: 'FAIL',
        detail: `Role saat ini '${effectiveSession.role}'. Pendaftaran pasien hanya diizinkan untuk role 'POSYANDU'.`,
      };
      return NextResponse.json(
        {
          success: false,
          error: 'Role bukan POSYANDU (403)',
          steps: validationSteps,
          diagnostics: { userAgent, latencyMs: Date.now() - startedAt },
        },
        { status: 403 }
      );
    }
    validationSteps.role = { status: 'PASS', detail: 'Role POSYANDU valid' };

    // 3. Posyandu target check
    const targetPosyanduId = posyanduId || effectiveSession.posyanduId;
    if (!targetPosyanduId || targetPosyanduId !== effectiveSession.posyanduId) {
      validationSteps.posyandu = {
        status: 'FAIL',
        detail: `Target posyandu (${targetPosyanduId}) tidak cocok dengan sesi aktif (${effectiveSession.posyanduId})`,
      };
      return NextResponse.json(
        {
          success: false,
          error: 'Posyandu target tidak sesuai sesi (403)',
          steps: validationSteps,
          diagnostics: { userAgent, latencyMs: Date.now() - startedAt },
        },
        { status: 403 }
      );
    }
    validationSteps.posyandu = { status: 'PASS', detail: `Posyandu ID: ${targetPosyanduId}` };

    // 4. Data validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      validationSteps.name = { status: 'FAIL', detail: 'Nama pasien kosong' };
      return NextResponse.json(
        { success: false, error: 'Nama wajib diisi', steps: validationSteps },
        { status: 400 }
      );
    }
    validationSteps.name = { status: 'PASS', detail: `Nama: ${name.trim()}` };

    if (!birthDate) {
      validationSteps.birthDate = {
        status: 'FAIL',
        detail: 'Tanggal lahir kosong (kemungkinan input date tidak mengirim nilai di webview)',
      };
      return NextResponse.json(
        { success: false, error: 'Tanggal lahir wajib diisi', steps: validationSteps },
        { status: 400 }
      );
    }
    const bdCheck = validateBirthDate(birthDate);
    if (!bdCheck.valid) {
      validationSteps.birthDate = { status: 'FAIL', detail: bdCheck.message || 'Tanggal lahir tidak valid' };
      return NextResponse.json(
        { success: false, error: bdCheck.message, steps: validationSteps },
        { status: 400 }
      );
    }
    validationSteps.birthDate = { status: 'PASS', detail: `Tanggal: ${birthDate}` };

    if (gender !== 'L' && gender !== 'P') {
      validationSteps.gender = { status: 'FAIL', detail: `Gender '${gender}' tidak valid` };
      return NextResponse.json(
        { success: false, error: 'Gender wajib L atau P', steps: validationSteps },
        { status: 400 }
      );
    }
    validationSteps.gender = { status: 'PASS', detail: `Gender: ${gender}` };

    // 5. DB query simulation (Dry-Run mode)
    const posyandu = await prisma.posyandu.findUnique({
      where: { id: targetPosyanduId },
      select: { id: true, name: true, code: true },
    });

    if (!posyandu) {
      validationSteps.dbLookup = { status: 'FAIL', detail: 'Posyandu tidak ditemukan di DB' };
      return NextResponse.json(
        { success: false, error: 'Posyandu tidak ditemukan', steps: validationSteps },
        { status: 404 }
      );
    }
    validationSteps.dbLookup = { status: 'PASS', detail: `Ditemukan: ${posyandu.name} (${posyandu.code})` };

    if (dryRun) {
      return NextResponse.json({
        success: true,
        mode: 'DRY_RUN (Tanpa tulis ke DB)',
        message: 'Semua validasi sistem dan otentikasi lolos 100%. Lingkungan siap digunakan mendaftar.',
        steps: validationSteps,
        diagnostics: {
          userAgent,
          cookiesPresent: Boolean(cookieHeader),
          latencyMs: Date.now() - startedAt,
        },
      });
    }

    // Real save test (hanya jika dryRun = false)
    const testPatient = await prisma.patient.create({
      data: {
        name: `[TEST-AUDIT] ${name.trim()}`,
        regNumber: `AUDIT-${Date.now().toString().slice(-6)}`,
        birthDate: new Date(birthDate),
        gender,
        posyanduId: targetPosyanduId,
        isPregnant: gender === 'P' && Boolean(isPregnant),
      },
    });

    return NextResponse.json({
      success: true,
      mode: 'REAL_SAVE',
      message: 'Pasien test berhasil dibuat. Segera hapus setelah selesai menguji.',
      createdId: testPatient.id,
      patient: testPatient,
      steps: validationSteps,
      diagnostics: {
        userAgent,
        latencyMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Kesalahan internal server',
        diagnostics: { userAgent, latencyMs: Date.now() - startedAt },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session || session.role !== 'POSYANDU') {
    return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib disertakan' }, { status: 400 });

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient || patient.posyanduId !== session.posyanduId) {
      return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 });
    }

    await prisma.patient.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Pasien uji berhasil dihapus bersih' });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus pasien uji' }, { status: 500 });
  }
}
