window.ISOCITY_DATA = (() => {
  const GITHUB_OWNER = 'Peterachss';

  const THEMES = {
    dark: {
      name: 'Dark',
      skyNight: '#14180f', skyDay: '#2a3322', forestA: '#2a4a28', forestB: '#274524',
      grassA: '#656D4A', grassB: '#5f6744', park: '#7b8458', waterA: '#566650', waterB: '#50604a',
      road: '#4a4337', curb: '#A68A64',
      crowns: [['#2c5a2b', '#3f7a35'], ['#3a6b2e', '#5a8f3c'], ['#c98a14', '#e8b832'], ['#d9a21f', '#f0c64a'], ['#b8601a', '#e08a2c'], ['#8a9a2a', '#b7b93a']],
    },
    forest: {
      name: 'Forest',
      skyNight: '#06120b', skyDay: '#cfe6d6', forestA: '#3f8a47', forestB: '#3a8042',
      grassA: '#7fbd69', grassB: '#76b562', park: '#92cd78', waterA: '#4f9aa0', waterB: '#478f95',
      road: '#4b5258', curb: '#b9b5a6',
      crowns: [['#2f7a3a', '#4fae5a'], ['#3a8a40', '#62c16a'], ['#2a6b36', '#46a052'], ['#4a9a48', '#7ad07c']],
    },
    autumn: {
      name: 'Autumn',
      skyNight: '#07110c', skyDay: '#1f3b2a', forestA: '#2a4a28', forestB: '#274524',
      grassA: '#7da663', grassB: '#74a05a', park: '#86b65f', waterA: '#295b60', waterB: '#26565b',
      road: '#454c54', curb: '#9c9586',
      crowns: [['#2c5a2b', '#3f7a35'], ['#3a6b2e', '#5a8f3c'], ['#c98a14', '#e8b832'], ['#d9a21f', '#f0c64a'], ['#b8601a', '#e08a2c'], ['#8a9a2a', '#b7b93a']],
    },
    sakura: {
      name: 'Sakura',
      skyNight: '#120a10', skyDay: '#f6e1e8', forestA: '#5f8a56', forestB: '#588350',
      grassA: '#9cc98a', grassB: '#93c182', park: '#a8d598', waterA: '#6aa5b8', waterB: '#609bae',
      road: '#55535a', curb: '#cdbfc4',
      crowns: [['#d98aa0', '#f4bccb'], ['#e3a0b2', '#f9d0da'], ['#4f8a4a', '#78b571'], ['#c97590', '#eaa7ba']],
    },
    desert: {
      name: 'Desert',
      skyNight: '#120d07', skyDay: '#f4e2bd', forestA: '#8a7a3c', forestB: '#827236',
      grassA: '#dcc590', grassB: '#d3bc86', park: '#b8b472', waterA: '#4d93a0', waterB: '#468995',
      road: '#5a5148', curb: '#e4d6b4',
      crowns: [['#6b7a2f', '#9db046'], ['#7d8a34', '#b4c456'], ['#5a6a2a', '#86993e'], ['#8a7a2a', '#bfae45']],
    },
    snow: {
      name: 'Snow',
      skyNight: '#0a121b', skyDay: '#dbe8f2', forestA: '#6b8493', forestB: '#627b8a',
      grassA: '#dbe5eb', grassB: '#d0dce4', park: '#bcd3c6', waterA: '#4b84a3', waterB: '#437b99',
      road: '#4c555f', curb: '#e3e9ee',
      crowns: [['#3e6358', '#d6e4e9'], ['#4a7064', '#e6eff3'], ['#35564d', '#cddce2'], ['#55806f', '#eef5f8']],
    },
  };

  const LANG_COLORS = {
    JavaScript: '#e0c25b',
    TypeScript: '#2b6cb0',
    Python: '#14b8a6',
    HTML: '#e07a5f',
    CSS: '#0f766e',
    Google: '#0284c7',
    Study: '#0f766e',
    Custom: '#d97706',
    Web: '#64748b',
  };

  const DEFAULT_REPOS = [
    { id: 'isocity', kind: 'github', name: 'isocity', lang: 'JavaScript', desc: 'Interactive isometric city workspace and live repository explorer.', web: 'https://isocity-mu.vercel.app', git: 'https://github.com/Peterachss/isocity' },
    { id: '3d-shirt-and-hoodie', kind: 'github', name: '3d-shirt-and-hoodie', lang: 'Python', desc: 'Interactive 3D Blender crewneck T-shirt and pullover hoodie studio.', web: 'https://peterachss.github.io/3d-shirt-and-hoodie/', git: 'https://github.com/Peterachss/3d-shirt-and-hoodie' },
    { id: 'finance-tracker-template', kind: 'github', name: 'finance-tracker-template', lang: 'TypeScript', desc: 'Spreadsheet-first personal finance tracker built with Next.js and Supabase.', web: 'https://finance-tracker-template.vercel.app', git: 'https://github.com/Peterachss/finance-tracker-template' },
    { id: 'finance-tracker', kind: 'github', name: 'finance-tracker', lang: 'JavaScript', desc: 'Personal finance tracker with a spreadsheet-first workflow.', web: 'https://finance-tracker-phi-ashen.vercel.app', git: 'https://github.com/Peterachss/finance-tracker', isPrivate: true },
    { id: 'maths-ia-explorer', kind: 'github', name: 'maths-ia-explorer', lang: 'TypeScript', desc: 'Interactive explorer for an IB Maths AA SL IA on income and life expectancy.', web: 'https://peterachss.github.io/maths-ia-explorer/', git: 'https://github.com/Peterachss/maths-ia-explorer' },
    { id: 'greenkeep', kind: 'github', name: 'greenkeep', lang: 'HTML', desc: 'Greenkeep notes web app.', web: 'https://peterachss.github.io/greenkeep/', git: 'https://github.com/Peterachss/greenkeep' },
    { id: 'cham-hq', kind: 'github', name: 'cham-hq', lang: 'JavaScript', desc: 'CHAM headquarters project hub.', web: 'https://peterachss.github.io/cham-hq/', git: 'https://github.com/Peterachss/cham-hq' },
    { id: 'cham-merch-designs', kind: 'github', name: 'cham-merch-designs', lang: 'HTML', desc: 'Hoodie and T-shirt design gallery.', web: 'https://peterachss.github.io/cham-merch-designs/', git: 'https://github.com/Peterachss/cham-merch-designs' },
    { id: 'cham-bracelet-plan', kind: 'github', name: 'cham-bracelet-plan', lang: 'HTML', desc: 'Fundraiser plan for friendship bracelet booth and lucky draw.', web: 'https://peterachss.github.io/cham-bracelet-plan/', git: 'https://github.com/Peterachss/cham-bracelet-plan' },
    { id: 'claude', kind: 'github', name: 'claude', lang: 'HTML', desc: 'Claude web notes and experiments.', web: 'https://peterachss.github.io/claude/', git: 'https://github.com/Peterachss/claude' },
    { id: 'uni-plan', kind: 'github', name: 'uni-plan', lang: 'HTML', desc: 'My university plan, a folder in the claude repo.', web: 'https://peterachss.github.io/claude/uni-plan/', git: 'https://github.com/Peterachss/claude', api: 'claude', path: 'uni-plan' },
    { id: 'econ-app', kind: 'github', name: 'econ-app', lang: 'HTML', desc: 'Interactive IB Economics revision guide.', web: 'https://econ-app-bice.vercel.app/', fixedWeb: true, git: 'https://github.com/Peterachss/econ-app' },
    {
      id: 'github-hub', kind: 'github', isCustom: true, name: 'GitHub', lang: '', cat: 'GitHub',
      desc: 'Quick access to GitHub: all your repositories, a new repo, issues and pull requests.',
      web: 'https://github.com/Peterachss?tab=repositories',
      alt: 'https://github.com/new', altLabel: 'New repo',
      shortcuts: [
        { label: 'My repositories', url: 'https://github.com/Peterachss?tab=repositories', sub: 'Every repo on your account' },
        { label: 'New repository', url: 'https://github.com/new', sub: 'Start a new repo' },
        { label: 'Pull requests', url: 'https://github.com/pulls', sub: 'PRs you opened or review' },
        { label: 'Issues', url: 'https://github.com/issues', sub: 'Issues assigned to you' },
        { label: 'Notifications', url: 'https://github.com/notifications', sub: 'Your inbox' },
        { label: 'This app (isocity)', url: 'https://github.com/Peterachss/isocity', sub: 'Code for this city' },
      ],
    },
  ];

  const DEFAULT_GOOGLE_APPS = [
    {
      id: 'gmail', kind: 'google', name: 'Gmail', cat: 'Google', study: false,
      desc: 'Email inbox, threads, and compose workspace.',
      web: 'https://mail.google.com/mail/u/0/#inbox',
      alt: 'https://mail.google.com/mail/u/0/#inbox?compose=new', altLabel: 'Compose',
      shortcuts: [
        { label: 'Inbox', url: 'https://mail.google.com/mail/u/0/#inbox', sub: 'Primary mail feed' },
        { label: 'Compose message', url: 'https://mail.google.com/mail/u/0/#inbox?compose=new', sub: 'Write a new email' },
        { label: 'Starred', url: 'https://mail.google.com/mail/u/0/#starred', sub: 'Flagged conversations' },
        { label: 'Sent', url: 'https://mail.google.com/mail/u/0/#sent', sub: 'Sent archive' },
      ],
    },
    {
      id: 'google-chat', kind: 'google', name: 'Google Chat', cat: 'Google', study: false,
      desc: 'Direct messages, group chats, and shared team spaces.',
      web: 'https://chat.google.com/',
      alt: 'https://mail.google.com/chat/u/0/#chat/spaces', altLabel: 'Spaces',
      shortcuts: [
        { label: 'Chat Home', url: 'https://chat.google.com/', sub: 'Unread threads and DMs' },
        { label: 'Team Spaces', url: 'https://mail.google.com/chat/u/0/#chat/spaces', sub: 'Shared channels' },
      ],
    },
    {
      id: 'seqta', kind: 'google', name: 'SEQTA', cat: 'Study', study: true,
      desc: 'Timetable, courses, assessments, and notices. Edit URL or customize timetable periods locally.',
      web: 'https://learn.ishcmc.edu.vn/#?page=/timetable',
      alt: 'https://learn.ishcmc.edu.vn/', altLabel: 'SEQTA home',
      shortcuts: [
        { label: 'Timetable', url: 'https://learn.ishcmc.edu.vn/#?page=/timetable', sub: 'Your school timetable' },
        { label: 'SEQTA home', url: 'https://learn.ishcmc.edu.vn/', sub: 'Courses, assessments and notices' },
      ],
    },
    {
      id: 'google-slides', kind: 'google', name: 'Google Slides', cat: 'Google', study: true,
      desc: 'Presentations, class decks, and collaborative slide editing.',
      web: 'https://docs.google.com/presentation/u/0/',
      alt: 'https://docs.google.com/presentation/create', altLabel: 'New deck',
      shortcuts: [
        { label: 'All presentations', url: 'https://docs.google.com/presentation/u/0/', sub: 'Recent slide decks' },
        { label: 'Create blank deck', url: 'https://docs.google.com/presentation/create', sub: 'Start a fresh deck' },
        { label: 'Google Drive', url: 'https://drive.google.com/', sub: 'Folders and shared decks' },
      ],
    },
    {
      id: 'google-docs', kind: 'google', name: 'Google Docs', cat: 'Google', study: true,
      desc: 'Essays, coursework drafts, and collaborative notes.',
      web: 'https://docs.google.com/document/u/0/',
      alt: 'https://docs.google.com/document/create', altLabel: 'New doc',
      shortcuts: [
        { label: 'All documents', url: 'https://docs.google.com/document/u/0/', sub: 'Browse existing docs' },
        { label: 'Create blank document', url: 'https://docs.google.com/document/create', sub: 'Open an empty document' },
        { label: 'Google Drive', url: 'https://drive.google.com/', sub: 'Open Drive folders' },
      ],
    },
    {
      id: 'blooket', kind: 'google', name: 'Blooket', cat: 'Study', study: true,
      desc: 'Study games and quiz sets: open your Blooket sets dashboard.',
      web: 'https://dashboard.blooket.com/my-sets',
      alt: 'https://dashboard.blooket.com/', altLabel: 'Dashboard',
      shortcuts: [
        { label: 'My sets', url: 'https://dashboard.blooket.com/my-sets', sub: 'Your question sets' },
        { label: 'Dashboard', url: 'https://dashboard.blooket.com/', sub: 'Blooket home' },
      ],
    },
    {
      id: 'toddle', kind: 'google', name: 'Toddle', cat: 'Study', study: true,
      desc: 'School learning platform: units, assessments, and class updates.',
      web: 'https://web.toddleapp.com/?type=loginHome',
      alt: 'https://web.toddleapp.com/', altLabel: 'Toddle home',
      shortcuts: [
        { label: 'Toddle login', url: 'https://web.toddleapp.com/?type=loginHome', sub: 'Units, tasks, and grades' },
      ],
    },
    {
      id: 'mybib', kind: 'google', name: 'MyBib', cat: 'Study', study: true,
      desc: 'Citation generator, bibliography folders, and formatted references.',
      web: 'https://www.mybib.com/app',
      alt: 'https://www.mybib.com/', altLabel: 'Cite tool',
      shortcuts: [
        { label: 'MyBib Projects', url: 'https://www.mybib.com/app', sub: 'Saved bibliographies and exports' },
        { label: 'Quick Citation Generator', url: 'https://www.mybib.com/', sub: 'Cite a URL, book, or journal' },
      ],
    },
    {
      id: 'google-calendar', kind: 'google', name: 'Google Calendar', cat: 'Google', study: true,
      desc: 'Schedule, classes, deadlines, and quick event planning.',
      web: 'https://calendar.google.com/calendar/u/0/r',
      alt: 'https://calendar.google.com/calendar/render?action=TEMPLATE', altLabel: 'New event',
      shortcuts: [
        { label: 'Calendar View', url: 'https://calendar.google.com/calendar/u/0/r', sub: 'Week and month grid' },
        { label: 'Create new event', url: 'https://calendar.google.com/calendar/render?action=TEMPLATE', sub: 'Add a class or reminder' },
        { label: 'Agenda list', url: 'https://calendar.google.com/calendar/u/0/r/agenda', sub: 'Upcoming schedule' },
      ],
    },
    {
      id: 'pomodoro', kind: 'google', name: 'Pomodoro Studio', cat: 'Study', study: true, localTool: 'pomodoro',
      desc: 'Focused 25/5 study timer that logs completed focus blocks to your study streak.',
      web: '', shortcuts: [],
    },
    {
      id: 'quick-notes', kind: 'google', name: 'Quick Notes', cat: 'Study', study: true, localTool: 'notes',
      desc: 'Persistent study scratchpad and task checklist saved locally in your browser.',
      web: '', shortcuts: [],
    },
  ];

  // North District (y = 3..15): GitHub City grouped cleanly
  const GITHUB_LANDMARKS = [
    { id: 'isocity',                  x: 8,  y: 4,  t: 'office',   lv: 3 },
    { id: 'finance-tracker-template', x: 15, y: 4,  t: 'office',   lv: 2 },
    { id: 'finance-tracker',          x: 21, y: 7,  t: 'apt',      lv: 2 },
    { id: '3d-shirt-and-hoodie',      x: 5,  y: 13, t: 'wheel',    lv: 1 },
    { id: 'maths-ia-explorer',        x: 4,  y: 8,  t: 'school',   lv: 1 },
    { id: 'greenkeep',                x: 10, y: 11, t: 'clinic',   lv: 1 },
    { id: 'cham-hq',                  x: 14, y: 13, t: 'plaza',    lv: 1 },
    { id: 'cham-merch-designs',       x: 8,  y: 12, t: 'shop',     lv: 2 },
    { id: 'cham-bracelet-plan',       x: 11, y: 15, t: 'shop',     lv: 1 },
    { id: 'claude',                   x: 17, y: 15, t: 'windmill', lv: 1 },
    { id: 'uni-plan',                  x: 23, y: 12, t: 'house',    lv: 2 },
    { id: 'github-hub',                x: 16, y: 9,  t: 'office',   lv: 2 },
  ];

  // South Bank across the bridges (y = 20..29): Google & Study District
  const GOOGLE_LANDMARKS = [
    { id: 'gmail',           x: 10, y: 22, t: 'office',   lv: 3 },
    { id: 'google-chat',     x: 16, y: 22, t: 'apt',      lv: 2 },
    { id: 'seqta',           x: 7,  y: 24, t: 'school',   lv: 1 },
    { id: 'google-docs',     x: 14, y: 24, t: 'clinic',   lv: 1 },
    { id: 'google-slides',   x: 21, y: 24, t: 'wheel',    lv: 1 },
    { id: 'mybib',           x: 11, y: 27, t: 'shop',     lv: 2 },
    { id: 'google-calendar', x: 17, y: 27, t: 'plaza',    lv: 1 },
    { id: 'pomodoro',        x: 21, y: 27, t: 'windmill', lv: 1 },
    { id: 'quick-notes',     x: 7,  y: 27, t: 'house',    lv: 2 },
    { id: 'toddle',          x: 14, y: 27, t: 'school',   lv: 1 },
  ];

  const SCENIC_PARKS = [
    [10, 6], [17, 11], [9, 15], [20, 15], [5, 6], [24, 9], [15, 6],
    [9, 20], [14, 20], [22, 20], [13, 27], [23, 27], [6, 22], [20, 22],
  ];

  const SPARE_NORTH = [
    [21, 11, 'shop', 2], [16, 9, 'apt', 2], [5, 11, 'house', 2],
    [24, 6, 'clinic', 1], [9, 7, 'house', 2], [20, 4, 'shop', 1],
    [26, 11, 'house', 2], [23, 15, 'school', 1],
  ];
  const SPARE_SOUTH = [
    [23, 22, 'shop', 2], [24, 24, 'house', 2], [15, 29, 'house', 2],
    [9, 29, 'apt', 1], [26, 24, 'office', 1], [6, 26, 'house', 1],
    [23, 29, 'shop', 1], [19, 29, 'clinic', 1],
  ];
  const GHOST_TOWN_LOTS = [
    [27, 4, 'house', 1], [28, 6, 'house', 1], [27, 8, 'shop', 1], [28, 10, 'house', 1], [27, 12, 'house', 1],
  ];

  const CITIZEN_NAMES = [
    ['Minh', 'Systems Dev'], ['Alex', 'UI Engineer'], ['Sam', 'Researcher'], ['Linh', 'Data Lead'],
    ['Kai', 'Build Ops'], ['Nora', 'Designer'], ['Eli', 'Student'], ['Mia', 'Docs Editor'],
  ];

  const DEFAULT_TIMETABLE = [
    { day: 'Mon', p1: 'Economics HL', p2: 'Maths AA SL', p3: 'Business HL', p4: 'English B HL' },
    { day: 'Tue', p1: 'ESS SL', p2: 'Economics HL', p3: 'TOK', p4: 'Maths AA SL' },
    { day: 'Wed', p1: 'Business HL', p2: 'English B HL', p3: 'ESS SL', p4: 'CAS Studio' },
    { day: 'Thu', p1: 'Maths AA SL', p2: 'Business HL', p3: 'Economics HL', p4: 'Study Hall' },
    { day: 'Fri', p1: 'English B HL', p2: 'ESS SL', p3: 'CAS Service', p4: 'Project Lab' },
  ];

  const ACHIEVEMENTS = [
    { id: 'first-inspect', title: 'City Explorer', desc: 'Inspect any building or map pin', check: (s) => s.inspected >= 1 },
    { id: 'pomodoro-1', title: 'Deep Focus', desc: 'Complete a Pomodoro focus block', check: (s) => s.pomodoros >= 1 },
    { id: 'pop-120', title: 'Growing District', desc: 'Reach 120 simulated city residents', check: (s) => s.pop >= 120 },
    { id: 'custom-place', title: 'Urban Planner', desc: 'Add or customize a building on the map', check: (s) => s.customized >= 1 },
    { id: 'bridge-cross', title: 'Cross-River Sync', desc: 'Visit both GitHub and Google districts', check: (s) => s.visitedGit && s.visitedGoogle },
  ];

  const SHORTCUTS_HELP = [
    ['/', 'Focus search bar'],
    ['Space', 'Pause or resume simulation'],
    ['R / E / Q', 'Rotate city 90 degrees'],
    ['+ / -', 'Zoom in or out'],
    ['P', 'Toggle Photo mode (hide UI)'],
    ['1 / 2', 'Overview or Street camera'],
    ['Double-click', 'Zoom smoothly to building'],
    ['Esc', 'Close active drawer or exit Photo mode'],
  ];

  // Web Audio sound effects + zoom-scaled ambience + calm pentatonic loop
  class CityAudio {
    constructor() {
      this.sfxOn = false;
      this.musicOn = false;
      this.ctx = null;
      this.lastSfx = 0;
      this.musicTimer = 0;
      this.noteIdx = 0;
      this.ambGain = null;
      this.ambOsc = null;
    }

    ensureCtx() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }

    sfx(kind) {
      if (!this.sfxOn) return;
      const now = performance.now();
      if (now - this.lastSfx < 48) return;
      this.lastSfx = now;
      try {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = kind === 'alert' ? 'sawtooth' : kind === 'celebrate' ? 'triangle' : 'sine';
        const f0 = kind === 'select' ? 320 : kind === 'celebrate' ? 440 : kind === 'alert' ? 180 : 210;
        const f1 = kind === 'select' ? 460 : kind === 'celebrate' ? 660 : kind === 'alert' ? 110 : 140;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + 0.06);
        gain.gain.setValueAtTime(0.032, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t); osc.stop(t + 0.085);
      } catch (e) {}
    }

    updateZoomAmbience(zoom) {
      if (!this.sfxOn) {
        if (this.ambGain && this.ctx) this.ambGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
        return;
      }
      try {
        const ctx = this.ensureCtx();
        if (!ctx) return;
        if (!this.ambGain) {
          const bufLen = ctx.sampleRate * 2;
          const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
          const data = buf.getChannelData(0);
          let prev = 0;
          for (let i = 0; i < bufLen; i++) {
            prev = (prev + 0.02 * (Math.random() * 2 - 1)) / 1.02;
            data[i] = prev * 2.5;
          }
          const src = ctx.createBufferSource();
          src.buffer = buf; src.loop = true;
          const filt = ctx.createBiquadFilter();
          filt.type = 'lowpass'; filt.frequency.value = 340;
          const gain = ctx.createGain();
          gain.gain.value = 0;
          src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
          src.start();
          this.ambGain = gain;
          this.ambFilt = filt;
        }
        const level = Math.max(0.002, Math.min(0.04, (zoom - 0.5) * 0.022));
        this.ambGain.gain.setTargetAtTime(level, ctx.currentTime, 0.2);
        this.ambFilt.frequency.setTargetAtTime(220 + zoom * 180, ctx.currentTime, 0.2);
      } catch (e) {}
    }

    setMusic(on) {
      this.musicOn = on;
      clearInterval(this.musicTimer);
      this.musicTimer = 0;
      if (!on) return;
      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
      const playNote = () => {
        if (!this.musicOn) return;
        try {
          const ctx = this.ensureCtx();
          if (!ctx) return;
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = notes[this.noteIdx % notes.length];
          this.noteIdx++;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.018, t + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + 2.0);
        } catch (e) {}
      };
      playNote();
      this.musicTimer = setInterval(playNote, 1800);
    }
  }

  return {
    GITHUB_OWNER, THEMES, LANG_COLORS, DEFAULT_REPOS, DEFAULT_GOOGLE_APPS,
    GITHUB_LANDMARKS, GOOGLE_LANDMARKS, SCENIC_PARKS, SPARE_NORTH, SPARE_SOUTH, GHOST_TOWN_LOTS,
    CITIZEN_NAMES, DEFAULT_TIMETABLE, ACHIEVEMENTS, SHORTCUTS_HELP, CityAudio,
  };
})();
