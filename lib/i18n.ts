// Interface language: Turkish (default) or English, chosen with the TR/EN switch
// and kept in a cookie so the server renders the right language first.
// Pure and client-safe: server code reads the cookie through lib/locale.ts.
import {
  clockTr,
  dayMonthTr,
  dayMonthYearTr,
  durationSinceTr,
  durationTr,
  monthShortTr,
  weekdayShortTr,
  weekdayTr,
} from '@/lib/format';
import { appTimeZone } from '@/lib/time';

export const LOCALES = ['tr', 'en'] as Pair;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = 'activate-lang';
export const DEFAULT_LOCALE: Locale = 'tr';
export const LOCALE_LABEL: Record<Locale, string> = { tr: 'TR', en: 'EN' };

export function parseLocale(value: string | undefined | null): Locale {
  return (LOCALES as readonly string[]).includes(value ?? '') ? (value as Locale) : DEFAULT_LOCALE;
}

// ───────────── English formatting (Turkish lives in lib/format.ts) ─────────────

const MIN = 60_000;

// 4h 12m · 45m · 2h · <1m · 0m
export function durationEn(ms: number): string {
  if (ms <= 0) return '0m';
  if (ms < MIN / 2) return '<1m';
  const totalMin = Math.round(ms / MIN);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const utcDate = (d: string) => new Date(`${d}T12:00:00Z`);
const en = (opts: Intl.DateTimeFormatOptions) => (d: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(utcDate(d));

export type Formatter = {
  duration: (ms: number) => string;
  durationShown: (ms: number) => string;
  clock: (date: Date) => string;
  weekday: (date: string) => string;
  weekdayShort: (date: string) => string;
  dayMonth: (date: string) => string;
  dayMonthYear: (date: string) => string;
  monthShort: (monthIndex: number) => string;
};

const FORMAT: Record<Locale, Formatter> = {
  tr: {
    duration: durationTr,
    durationShown: (ms) => (ms <= 0 ? '—' : durationTr(ms)),
    clock: (d) => clockTr(d),
    weekday: weekdayTr,
    weekdayShort: weekdayShortTr,
    dayMonth: dayMonthTr,
    dayMonthYear: dayMonthYearTr,
    monthShort: monthShortTr,
  },
  en: {
    duration: durationEn,
    durationShown: (ms) => (ms <= 0 ? '—' : durationEn(ms)),
    clock: (d) => new Intl.DateTimeFormat('en-GB', { timeZone: appTimeZone(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d),
    weekday: en({ weekday: 'long' }),
    weekdayShort: en({ weekday: 'short' }),
    dayMonth: en({ day: 'numeric', month: 'long' }),
    dayMonthYear: en({ day: 'numeric', month: 'long', year: 'numeric' }),
    // Fixed list: ICU builds disagree on September ("Sep" vs "Sept").
    monthShort: (i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i] ?? '',
  },
};

export function formatter(locale: Locale): Formatter {
  return FORMAT[locale];
}

// ───────────── Messages ─────────────

type Pair = readonly [string, string];
type Triple = readonly [string, string, string];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const tr = {
  meta: {
    description: 'Ekibin Slack’te ne zaman aktif olduğunu canlı gösterir.',
    team: 'Ekip',
    signIn: 'Giriş',
    linkSignIn: 'Slack bağlantısıyla giriş',
    notFound: 'Bulunamadı',
    installError: 'Bağlanamadı',
    installSuccess: 'Workspace bağlandı',
  },
  skip: 'İçeriğe geç',
  logoLabel: 'Activate, bugüne git',
  language: 'Dil',
  theme: { label: 'Görünüm', title: 'Görünüm: Afiş ya da Sinyal' },
  menu: { connect: 'Slack workspace bağla', signOut: 'Çıkış yap' },
  people: (n: number) => `${n} kişi`,
  footer: { poll: 'Slack durumları 2 dakikada bir okunur.', honest: 'Slack’te aktif görünmek, çalışmak demek değildir.' },
  presence: { active: 'aktif', away: 'uzakta', unknown: 'bilinmiyor' },
  live: {
    title: 'Veri Slack’ten 2 dakikada bir okunur; sayfa 30 saniyede bir yenilenir.',
    waiting: 'İlk veri bekleniyor',
    live: 'Canlı',
    stale: (ago: string) => `Son veri ${ago}`,
    fresh: (ago: string) => `Canlı · ${ago} güncellendi`,
    ago: (s: number) => (s < 60 ? `${s} sn önce` : s < 3600 ? `${Math.round(s / 60)} dk önce` : `${Math.round(s / 3600)} saat önce`),
  },
  day: {
    pick: 'Gün seç',
    pickDate: 'Tarih seç',
    prev: (d: string) => `Önceki gün, ${d}`,
    next: (d: string) => `Sonraki gün, ${d}`,
    today: 'Bugün',
    yesterday: 'Dün',
    goToday: 'Bugüne git',
    backToday: 'Bugüne dön',
  },
  now: 'şu an',
  state: {
    activeFor: (ms: number) => `${durationSinceTr(ms)} aktif`,
    activeNow: 'şu an aktif',
    lastActive: (when: string) => `son aktif ${when}`,
    notSeen: 'henüz görülmedi',
    sessions: (n: number) => `${n} aktif aralık`,
    notActiveThatDay: 'bu gün aktif değildi',
  },
  team: {
    dayNav: 'Ekibin günü',
    summary: 'Günün özeti',
    word: 'aktif',
    srNow: ' kişi şu an Slack’te',
    liveCap: (people: number, active: number) => [`${people} kişiden ${active} kişi şu an Slack’te aktif. Ekip bugün toplam `, ' aktifti.'] as Pair,
    pastSr: (d: string) => `${d} günü ekip toplamı `,
    pastCap: (d: string, people: number, withTime: number) => [`${d} günü ${people} kişiden ${withTime} kişi Slack’te aktifti; ekip toplam `, '.'] as Pair,
    title: 'Ekip',
    order: (live: boolean): string => (live ? 'Önce şu an aktif olanlar, sonra alfabetik' : 'Alfabetik'),
    stripAfis: (live: boolean) => `şerit: günün 24 saati, siyah = aktif${live ? ', pembe çizgi = şimdi' : ''}`,
    stripSinyal: (live: boolean) => `şerit: günün 24 saati, █ = aktif${live ? ', sarı = şimdi' : ''}`,
    firstDataTitle: 'İlk veri yolda.',
    firstDataBody: 'Workspace bağlandı ama Slack’ten henüz okuma gelmedi. İlk okuma 2 dakika içinde gelir; sayfa kendini yeniler.',
    you: 'sen',
    guest: 'Slack misafiri',
    guestTitle: 'Bu kişi Slack’te misafir hesapla bulunuyor',
    srToday: 'bugün ',
    srOn: (d: string) => `${d} günü `,
    note: 'Süreler, Slack’te yeşil “aktif” noktasıyla göründüğün zamandır: Slack açık ve kullanılıyorken aktif sayılırsın. Toplantıda, telefonda ya da odaklanmış çalışırken burada görünmeyebilirsin. Bu bir çalışma süresi ölçümü değildir; liste kimseyi sıralamaz.',
    noTeamTitle: 'Henüz bir ekibin yok.',
    noTeamBody: (email: string) => `${email} adresi, Activate’e bağlı hiçbir Slack ekibinde üye olarak görünmüyor.`,
    noTeamAdmin: ' Bir Slack workspace’i bağlayarak başla.',
    noTeamMember: ' Ekibinin Slack’te kullandığın hesabıyla girdiğinden emin ol; olmadıysa Activate linkini paylaşan kişiye sor.',
    otherAccount: 'Başka hesapla giriş yap',
  },
  log: {
    today: 'Bugünün hareketleri',
    thatDay: 'Günün hareketleri',
    emptyLive: 'bugün henüz hareket yok',
    emptyPast: 'bu gün hareket yok',
    active: 'aktif oldu',
    away: 'uzaklaştı',
    watching: 'izleniyor',
  },
  person: {
    back: 'Tüm ekip',
    total: 'Toplam',
    sessions: 'Aktif aralık',
    longest: 'En uzun',
    first: 'İlk',
    last: 'Son',
    dayTitle: 'Gün',
    dayDesc: '00:00’dan 24:00’a, Slack’te aktif olduğu aralıklar',
    sessionsTitle: 'Aralıklar',
    noSessions: 'Aktif aralık yok',
    noneToday: 'Bugün henüz Slack’te aktif olmadı.',
    noneThatDay: 'Bu gün Slack’te aktif değildi.',
    to: ' ile ',
    weekTitle: 'Hafta',
    weekTotal: (d: string) => `Toplam ${d}`,
    yearDesc: 'Her kare bir gün; bir kareye tıkla, o güne git',
  },
  strip: {
    none: 'Bu gün Slack’te aktif değildi.',
    list: (n: number, parts: string) => `${n} aktif aralık: ${parts}`,
  },
  week: { notYet: 'henüz gelmedi' },
  heat: {
    summary: (year: string, days: number, total: string) => `${year} yılında ${days} gün aktif, toplam ${total}.`,
    weekdays: ['pzt', 'çar', 'cum'],
    less: 'az',
    more: 'çok · 1 kare = 1 gün',
    sinyal: 'her karakter bir gün: o gün aktif olunan tam saat (· = hiç, + = 10 ve üstü)',
  },
  loading: 'Yükleniyor',
  loadingSinyal: 'yükleniyor',
  signin: {
    errors: {
      AccessDenied: {
        title: 'Bu Slack hesabı bağlı bir ekipte bulunamadı.',
        body: 'Activate’e bağlı bir Slack workspace’inde kullandığın hesapla giriş yap. Emin değilsen, Activate linkini paylaşan kişiye sor.',
      },
      LinkExpired: {
        title: 'Bu giriş bağlantısı artık geçerli değil.',
        body: 'Bağlantılar 10 dakika geçerli ve tek kullanımlık. Slack’te /activate yazıp yenisini al.',
      },
      OAuthCallbackError: { title: 'Slack girişi yarıda kaldı.', body: 'Slack onay ekranında iptal edilmiş olabilir. Tekrar dene.' },
      Configuration: { title: 'Giriş şu an çalışmıyor.', body: 'Sunucu tarafında bir ayar eksik. Yöneticine haber ver.' },
    } as Record<string, { title: string; body: string }>,
    fallback: { title: 'Giriş tamamlanamadı.', body: 'Bir şey ters gitti. Tekrar dene; sürerse yöneticine yaz.' },
    boot1: 'slack bağlantısı',
    ready: 'hazır',
    boot2: 'giriş bekleniyor…',
    title: ['Kim', 'burada?'] as Pair,
    leadBefore: 'Activate, ekibinden kimin Slack’te ',
    leadEm: 'şu an aktif',
    leadAfter: ' olduğunu ve bugün ne kadar aktif kaldığını gösterir.',
    privacy: 'Herkes yalnızca üyesi olduğu Slack ekiplerini görür. Şifre yok: Slack hesabınla girersin.',
    button: 'Slack ile giriş yap',
    fineBefore: 'Telefondan mı giriyorsun? Slack uygulamasında herhangi bir sohbete ',
    fineAfter: ' yaz; gelen “Activate’e gir” bağlantısına dokun. Şifre ya da workspace adresi sorulmaz.',
    foot: 'Slack durumları 2 dakikada bir okunur · Slack’te aktif görünmek çalışmak demek değildir',
    badge: ['2 dk’da', 'bir', 'yenilenir'] as Triple,
  },
  link: {
    title: ['Slack’ten', 'geldin.'] as Pair,
    lead: 'Bağlantın hazır. Tek dokunuşla Activate’e gir; bağlantı bir kez kullanılabilir ve 10 dakika geçerlidir.',
    button: 'Activate’e gir',
    missingTitle: 'Bağlantı eksik.',
    missingBody: 'Slack’te /activate yazıp gelen bağlantıyı aç.',
  },
  install: {
    errors: {
      access_denied: 'Slack onay ekranında “İptal” seçildi. Hazır olduğunda tekrar başlat.',
      invalid_state: 'Bağlantı isteğinin süresi doldu. “Tekrar dene” ile yeniden başlat.',
      not_signed_in: 'Kurulumu tamamlamak için önce Activate’e Slack ile giriş yap.',
      team_not_allowed: 'Bu Slack workspace’i Activate’e bağlamaya izin verilmiyor.',
      token_exchange_failed: 'Slack yetkilendirmeyi tamamlamadı. Tekrar dene.',
      no_code: 'Slack’ten yetkilendirme kodu gelmedi. Tekrar dene.',
      config_error: 'Sunucu tarafında bir ayar eksik. Yöneticine haber ver.',
    } as Record<string, string>,
    unexpected: 'Beklenmedik bir hata oluştu. Tekrar dene; sürerse yöneticine yaz.',
    failTitle: 'Bağlanamadı.',
    failLead: 'Slack workspace’i Activate’e bağlanmadı.',
    retry: 'Tekrar dene',
    boot: ['slack izni', 'bağlantı güvenle kaydedildi', 'ilk okuma ≤ 2 dk'] as Triple,
    ok: 'tamam',
    successTitle: 'Bağlandı!',
    successLead: 'İlk veriler 2 dakika içinde gelir. Ekibindekiler Slack hesaplarıyla girip yalnızca kendi ekiplerini görür.',
  },
  notFound: {
    appTitle: 'Sayfa bulunamadı.',
    appBody: 'Bu bağlantıdaki kişi ya da sayfa yok. Bağlantı eski olabilir ya da bu kişi senin ekiplerinden birinde değil.',
    title: ['Sayfa', 'yok.'] as Pair,
    body: 'Bu bağlantıda bir sayfa bulunamadı. Bağlantı eski ya da eksik olabilir.',
  },
  error: {
    title: 'Bir şey koptu.',
    body: 'Sayfa yüklenirken bir hata oluştu. Veriler güvende; tekrar denemek genelde yeter.',
    code: (c: string) => ` (kod: ${c})`,
  },
};

export type Messages = typeof tr;

const enMessages: Messages = {
  meta: {
    description: 'Shows live when your team is active on Slack.',
    team: 'Team',
    signIn: 'Sign in',
    linkSignIn: 'Sign in with a Slack link',
    notFound: 'Not found',
    installError: 'Not connected',
    installSuccess: 'Workspace connected',
  },
  skip: 'Skip to content',
  logoLabel: 'Activate, go to today',
  language: 'Language',
  theme: { label: 'Theme', title: 'Theme: Afiş (poster) or Sinyal (terminal)' },
  menu: { connect: 'Connect a Slack workspace', signOut: 'Sign out' },
  people: (n) => plural(n, 'person', 'people'),
  footer: { poll: 'Slack presence is read every 2 minutes.', honest: 'Showing as active on Slack is not the same as working.' },
  presence: { active: 'active', away: 'away', unknown: 'unknown' },
  live: {
    title: 'Data is read from Slack every 2 minutes; the page refreshes every 30 seconds.',
    waiting: 'Waiting for first data',
    live: 'Live',
    stale: (ago) => `Last data ${ago}`,
    fresh: (ago) => `Live · updated ${ago}`,
    ago: (s) => (s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)}h ago`),
  },
  day: {
    pick: 'Pick a day',
    pickDate: 'Pick a date',
    prev: (d) => `Previous day, ${d}`,
    next: (d) => `Next day, ${d}`,
    today: 'Today',
    yesterday: 'Yesterday',
    goToday: 'Go to today',
    backToday: 'Back to today',
  },
  now: 'now',
  state: {
    activeFor: (ms) => {
      const d = durationEn(ms);
      return d === '<1m' || d === '0m' ? 'active just now' : `active for ${d}`;
    },
    activeNow: 'active now',
    lastActive: (when) => `last active ${when}`,
    notSeen: 'not seen yet',
    sessions: (n) => plural(n, 'session', 'sessions'),
    notActiveThatDay: 'not active this day',
  },
  team: {
    dayNav: 'The team’s day',
    summary: 'Day summary',
    word: 'active',
    srNow: ' people on Slack right now',
    liveCap: (people, active) => [`${active} of ${people} people are active on Slack right now. The team has been active for `, ' today.'] as Pair,
    pastSr: (d) => `Team total on ${d} `,
    pastCap: (d, people, withTime) => [`On ${d}, ${withTime} of ${people} people were active on Slack; team total `, '.'] as Pair,
    title: 'Team',
    order: (live) => (live ? 'Active now first, then A–Z' : 'A–Z'),
    stripAfis: (live) => `strip: the day’s 24 hours, black = active${live ? ', pink line = now' : ''}`,
    stripSinyal: (live) => `strip: the day’s 24 hours, █ = active${live ? ', yellow = now' : ''}`,
    firstDataTitle: 'First data on its way.',
    firstDataBody: 'The workspace is connected but no reading has come from Slack yet. The first one arrives within 2 minutes; the page refreshes itself.',
    you: 'you',
    guest: 'Slack guest',
    guestTitle: 'This person has a guest account in Slack',
    srToday: 'today ',
    srOn: (d) => `on ${d} `,
    note: 'Times are when you showed the green “active” dot in Slack: you count as active while Slack is open and in use. In a meeting, on the phone or in deep work you may not show up here. This is not a measure of working time, and the list ranks nobody.',
    noTeamTitle: 'No team yet.',
    noTeamBody: (email) => `${email} isn’t a member of any Slack workspace connected to Activate.`,
    noTeamAdmin: ' Start by connecting a Slack workspace.',
    noTeamMember: ' Make sure you signed in with the account your team uses on Slack; if so, ask whoever shared the Activate link.',
    otherAccount: 'Sign in with another account',
  },
  log: {
    today: 'Today’s activity',
    thatDay: 'The day’s activity',
    emptyLive: 'no activity yet today',
    emptyPast: 'no activity this day',
    active: 'came online',
    away: 'went away',
    watching: 'watching',
  },
  person: {
    back: 'Whole team',
    total: 'Total',
    sessions: 'Sessions',
    longest: 'Longest',
    first: 'First',
    last: 'Last',
    dayTitle: 'Day',
    dayDesc: 'Midnight to midnight: when they were active on Slack',
    sessionsTitle: 'Sessions',
    noSessions: 'No sessions',
    noneToday: 'Not active on Slack yet today.',
    noneThatDay: 'Not active on Slack this day.',
    to: ' to ',
    weekTitle: 'Week',
    weekTotal: (d) => `Total ${d}`,
    yearDesc: 'Each square is a day; click one to open it',
  },
  strip: {
    none: 'Not active on Slack this day.',
    list: (n, parts) => `${plural(n, 'session', 'sessions')}: ${parts}`,
  },
  week: { notYet: 'not yet' },
  heat: {
    summary: (year, days, total) => `Active on ${days} days in ${year}, ${total} in total.`,
    weekdays: ['Mon', 'Wed', 'Fri'],
    less: 'less',
    more: 'more · 1 square = 1 day',
    sinyal: 'each character is a day: whole hours active that day (· = none, + = 10 or more)',
  },
  loading: 'Loading',
  loadingSinyal: 'loading',
  signin: {
    errors: {
      AccessDenied: {
        title: 'This Slack account isn’t in a connected workspace.',
        body: 'Sign in with the account you use in a Slack workspace connected to Activate. Not sure? Ask whoever shared the Activate link.',
      },
      LinkExpired: {
        title: 'This sign-in link is no longer valid.',
        body: 'Links work once and for 10 minutes. Type /activate in Slack to get a new one.',
      },
      OAuthCallbackError: { title: 'Slack sign-in didn’t finish.', body: 'It may have been cancelled on Slack’s consent screen. Try again.' },
      Configuration: { title: 'Sign-in isn’t working right now.', body: 'A server setting is missing. Let your admin know.' },
    },
    fallback: { title: 'Sign-in didn’t complete.', body: 'Something went wrong. Try again; if it keeps happening, tell your admin.' },
    boot1: 'slack connection',
    ready: 'ready',
    boot2: 'waiting for sign-in…',
    title: ['Who’s', 'here?'] as Pair,
    leadBefore: 'Activate shows who on your team is ',
    leadEm: 'active on Slack right now',
    leadAfter: ', and how long they’ve been active today.',
    privacy: 'Everyone sees only the Slack workspaces they belong to. No passwords: you sign in with Slack.',
    button: 'Sign in with Slack',
    fineBefore: 'On your phone? Type ',
    fineAfter: ' in any chat in the Slack app and tap the link it sends back. No password, no workspace address.',
    foot: 'Slack presence is read every 2 minutes · Showing as active on Slack is not the same as working',
    badge: ['Fresh', 'every', '2 min'] as Triple,
  },
  link: {
    title: ['Hello', 'from Slack.'] as Pair,
    lead: 'Your link is ready. One tap and you’re in; it works once and for 10 minutes.',
    button: 'Open Activate',
    missingTitle: 'The link is incomplete.',
    missingBody: 'Type /activate in Slack and open the link it sends.',
  },
  install: {
    errors: {
      access_denied: '“Cancel” was chosen on Slack’s consent screen. Start again when you’re ready.',
      invalid_state: 'The connection request expired. Start again with “Try again”.',
      not_signed_in: 'Sign in to Activate with Slack first, then connect the workspace.',
      team_not_allowed: 'This Slack workspace isn’t allowed to connect to Activate.',
      token_exchange_failed: 'Slack didn’t finish the authorisation. Try again.',
      no_code: 'Slack didn’t send an authorisation code. Try again.',
      config_error: 'A server setting is missing. Let your admin know.',
    },
    unexpected: 'Something unexpected went wrong. Try again; if it keeps happening, tell your admin.',
    failTitle: 'Not connected.',
    failLead: 'The Slack workspace wasn’t connected to Activate.',
    retry: 'Try again',
    boot: ['slack permission', 'connection stored securely', 'first reading ≤ 2 min'] as Triple,
    ok: 'ok',
    successTitle: 'Connected!',
    successLead: 'The first data arrives within 2 minutes. Your teammates sign in with Slack and see only their own workspaces.',
  },
  notFound: {
    appTitle: 'Page not found.',
    appBody: 'There’s no person or page at this link. It may be old, or this person isn’t in one of your workspaces.',
    title: ['No such', 'page.'] as Pair,
    body: 'Nothing lives at this link. It may be old or incomplete.',
  },
  error: {
    title: 'Something broke.',
    body: 'An error happened while loading the page. Your data is safe; trying again usually works.',
    code: (c) => ` (code: ${c})`,
  },
};

const MESSAGES: Record<Locale, Messages> = { tr, en: enMessages };

export function messages(locale: Locale): Messages {
  return MESSAGES[locale];
}
