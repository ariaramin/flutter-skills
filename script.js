const skills = [
  { name: 'Flutter production engineering', group: 'Foundations', icon: '⚡', description: 'Production-grade architecture, performance, profiling, and maintainability.', featured: true },
  { name: 'Senior Flutter architecture', group: 'Foundations', icon: '⌘', description: 'Production architecture, boundaries, and explicit trade-offs.', featured: true },
  { name: 'Dart & Flutter Equatable', group: 'Foundations', icon: '◆', description: 'Value equality, immutable state, and reliable rebuilds.' },
  { name: 'Freezed', group: 'Foundations', icon: '◇', description: 'Immutable models, unions, JSON serialization, and code generation.' },
  { name: 'Flutter multi-environment', group: 'Foundations', icon: '⌂', description: 'Development, staging, production flavors, and configuration.' },
  { name: 'Flutter design systems', group: 'UI & UX', icon: '▦', description: 'Tokens, components, states, and design.md to Flutter workflows.', featured: true },
  { name: 'Flutter animations', group: 'UI & UX', icon: '◌', description: 'Accessible motion, transitions, and animation performance.' },
  { name: 'Flutter SVG', group: 'UI & UX', icon: '✦', description: 'Rendering, theming, caching, performance, and SVG security.' },
  { name: 'Flutter image performance', group: 'UI & UX', icon: '▧', description: 'Image loading, decoding, caching, and memory use.' },
  { name: 'Flutter UI performance', group: 'Performance', icon: '⌁', description: 'Frame-budget analysis, rebuild, layout, paint, and raster work.', featured: true },
  { name: 'Flutter jank optimization', group: 'Performance', icon: '↯', description: 'Profiling and fixing dropped frames, slow scrolling, and latency.' },
  { name: 'Flutter concurrency', group: 'Performance', icon: '⇄', description: 'Isolates, async workflows, lifecycle management, and efficiency.' },
  { name: 'Flutter memory leaks', group: 'Performance', icon: '◎', description: 'Lifecycle defects, leak tracking, and regression prevention.' },
  { name: 'Flutter Dio', group: 'Platform & data', icon: '⇄', description: 'Production HTTP clients, auth, retries, transfers, and observability.' },
  { name: 'Flutter go_router', group: 'Platform & data', icon: '↗', description: 'Routing, deep links, redirects, and nested navigation.' },
  { name: 'Flutter Supabase', group: 'Platform & data', icon: '▲', description: 'Auth, RLS, database access, realtime, storage, and edge functions.' },
  { name: 'Flutter Drift', group: 'Platform & data', icon: '▤', description: 'Relational persistence, migrations, and reactive SQLite queries.' },
  { name: 'Flutter secure storage', group: 'Security', icon: '◇', description: 'Protected credentials and platform key stores.' },
  { name: 'Flutter application security', group: 'Security', icon: '⬡', description: 'End-to-end application security reviews and remediation.' },
  { name: 'Flutter app hardening', group: 'Security', icon: '◈', description: 'Tamper protection, reverse-engineering resistance, and releases.' },
  { name: 'Flutter Firebase Analytics', group: 'Production', icon: '✦', description: 'Product events, consent, identity, and measurement quality.' },
  { name: 'Flutter Sentry', group: 'Production', icon: '◉', description: 'Crash reporting, tracing, symbolication, and privacy.' },
  { name: 'Flutter production build & release', group: 'Production', icon: '⤴', description: 'Builds, signing, packaging, stores, and release recovery.' },
  { name: 'Test before deploy', group: 'Quality', icon: '✓', description: 'Release-ready test coverage using a practical quality taxonomy.' },
  { name: 'Flutter lints & static analysis', group: 'Quality', icon: '☷', description: 'Analyzer configuration, lint governance, and CI quality gates.' },
  { name: 'Flutter expert tips', group: 'Quality', icon: '✧', description: 'Practical implementation, debugging, refactoring, and modernization.' },
];

const categories = [
  ['Foundations', '⌘', 'Architecture, Dart, state, and app structure.', '05'],
  ['UI & UX', '◌', 'Components, motion, images, and design systems.', '04'],
  ['Platform & data', '⇄', 'Networking, navigation, storage, and services.', '04'],
  ['Production', '⤴', 'Performance, security, testing, and delivery.', '13'],
];

const rawSkillsBase = 'https://raw.githubusercontent.com/ariaramin/flutter-skills/main/skills';
const skillFiles = {
  'Flutter production engineering': 'flutter-production-engineering.skill',
  'Senior Flutter architecture': 'senior-flutter-architecture.skill',
  'Dart & Flutter Equatable': 'dart-flutter-equatable-engineering.skill',
  Freezed: 'freezed-production-engineering.skill',
  'Flutter multi-environment': 'flutter-multi-environment.skill',
  'Flutter design systems': 'flutter-design-system-from-design-md.skill',
  'Flutter animations': 'flutter-animations-production-engineering.skill',
  'Flutter SVG': 'flutter-svg-engineering.skill',
  'Flutter image performance': 'flutter-image-performance.skill',
  'Flutter UI performance': 'flutter-ui-performance-engineering.skill',
  'Flutter jank optimization': 'flutter-performance-jank-optimization.skill',
  'Flutter concurrency': 'flutter-concurrency-memory-performance.skill',
  'Flutter memory leaks': 'flutter-memory-leak-engineering.skill',
  'Flutter Dio': 'flutter-dio-engineering.skill',
  'Flutter go_router': 'flutter-go-router-engineering.skill',
  'Flutter Supabase': 'flutter-supabase-engineering.skill',
  'Flutter Drift': 'flutter-drift-persistence-engineering.skill',
  'Flutter secure storage': 'flutter-secure-storage-security-engineering.skill',
  'Flutter application security': 'flutter-application-security-engineering.skill',
  'Flutter app hardening': 'flutter-app-hardening-reverse-engineering.skill',
  'Flutter Firebase Analytics': 'flutter-firebase-analytics.skill',
  'Flutter Sentry': 'flutter-sentry-engineering.skill',
  'Flutter production build & release': 'flutter-production-build-release.skill',
  'Test before deploy': 'test-before-deploy.skill',
  'Flutter lints & static analysis': 'flutter-lints-static-analysis-engineering.skill',
  'Flutter expert tips': 'flutter-expert-tips.skill',
};

const selectedSkills = new Set();

const categoryGrid = document.querySelector('#category-grid');
categoryGrid.innerHTML = categories.map(([name, icon, description, count], index) => `<article class="category-card reveal" style="animation-delay:${index * 0.08}s"><span class="category-count">${count}${count.includes('area') ? '' : ' skills'}</span><div class="category-icon">${icon}</div><h3>${name}</h3><p>${description}</p></article>`).join('');

const filters = ['All', ...new Set(skills.map(skill => skill.group))];
const filterWrap = document.querySelector('#filter-wrap');
let activeFilter = 'All';
let activeCommand = 'curl';
filterWrap.innerHTML = filters.map((filter, index) => `<button class="filter-button${index === 0 ? ' active' : ''}" type="button" data-filter="${filter}">${filter}</button>`).join('');

const grid = document.querySelector('#skill-grid');
const emptyState = document.querySelector('#empty-state');
const search = document.querySelector('#skill-search');

function renderSkills() {
  const query = search.value.trim().toLowerCase();
  const visible = skills.filter(skill => (activeFilter === 'All' || skill.group === activeFilter) && [skill.name, skill.group, skill.description].some(value => value.toLowerCase().includes(query)));
  grid.innerHTML = visible.map(skill => `<button class="skill-card${selectedSkills.has(skill.name) ? ' selected' : ''}" type="button" data-skill="${skill.name}" aria-pressed="${selectedSkills.has(skill.name)}"><div class="skill-card-top"><span class="skill-logo">${skill.icon}</span><span class="skill-tag">${skill.group}</span></div><h3>${skill.name}${skill.featured ? ' <span class="featured-star">✦</span>' : ''}</h3><p>${skill.description}</p><span class="skill-select-mark" aria-hidden="true">✓</span></button>`).join('');
  emptyState.hidden = visible.length > 0;
  updateSelectionBar();
}

const selectionBar = document.querySelector('#selection-bar');
const selectionCount = document.querySelector('#selection-count');
const commandPanel = document.querySelector('#command-panel');
const commandOutput = document.querySelector('#install-commands code');
const commandNote = document.querySelector('#command-note');
const copyStatus = document.querySelector('#copy-status');

function updateSelectionBar() {
  const count = selectedSkills.size;
  selectionCount.textContent = count;
  selectionBar.hidden = count === 0;
}

function buildInstallCommands() {
  const files = [...selectedSkills].map(name => skillFiles[name]);
  if (activeCommand === 'npx') return 'npx degit ariaramin/flutter-skills/skills ./selected-skills';
  if (activeCommand === 'git') return ['mkdir -p ./selected-skills', 'git clone --filter=blob:none --sparse https://github.com/ariaramin/flutter-skills.git ./flutter-skills-install', `git -C ./flutter-skills-install sparse-checkout set --no-cone ${files.map(file => `skills/${file}`).join(' ')}`, 'cp ./flutter-skills-install/skills/*.skill ./selected-skills/'].join('\n');
  const downloader = activeCommand === 'wget' ? file => `wget -q "${rawSkillsBase}/${file}" -O "./selected-skills/${file}"` : file => `curl -fL "${rawSkillsBase}/${file}" -o "./selected-skills/${file}"`;
  return ['mkdir -p ./selected-skills', ...files.map(downloader)].join('\n');
}

function renderCommand() {
  commandOutput.textContent = buildInstallCommands();
  commandNote.innerHTML = activeCommand === 'npx'
    ? 'The <code>npx</code> command fetches the complete <code>skills/</code> folder. Use <code>curl</code>, <code>wget</code>, or <code>git</code> when you need only the selected archives.'
    : 'These commands download the selected <code>.skill</code> archives into <code>./selected-skills</code>. Import those archives into your compatible AI coding tool.';
}

grid.addEventListener('click', event => {
  const card = event.target.closest('[data-skill]');
  if (!card) return;
  const name = card.dataset.skill;
  selectedSkills.has(name) ? selectedSkills.delete(name) : selectedSkills.add(name);
  renderSkills();
});

document.querySelector('#clear-selection').addEventListener('click', () => {
  selectedSkills.clear();
  commandPanel.hidden = true;
  renderSkills();
});

document.querySelector('#generate-commands').addEventListener('click', () => {
  renderCommand();
  commandPanel.hidden = false;
  commandPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.querySelector('#command-tabs').addEventListener('click', event => {
  const tab = event.target.closest('[data-command]');
  if (!tab) return;
  activeCommand = tab.dataset.command;
  document.querySelectorAll('.command-tab').forEach(item => {
    const isActive = item === tab;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-selected', String(isActive));
  });
  renderCommand();
});

document.querySelector('#close-panel').addEventListener('click', () => { commandPanel.hidden = true; });
document.querySelector('#copy-commands').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(commandOutput.textContent);
    copyStatus.textContent = 'Copied';
  } catch {
    copyStatus.textContent = 'Copy unavailable — select the commands above';
  }
  setTimeout(() => { copyStatus.textContent = ''; }, 2200);
});

filterWrap.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button));
  renderSkills();
});

search.addEventListener('input', renderSkills);
renderSkills();

const menuButton = document.querySelector('.menu-button');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  document.querySelector('.nav-links').classList.toggle('mobile-open', !open);
});
