const repository = 'ariaramin/flutter-skills';

const categories = [
  { id: 'foundations', name: 'Foundations and architecture', short: 'Foundations', icon: '⌘', description: 'Architecture, Dart, packages, and the structure of the app.' },
  { id: 'ui', name: 'UI and user experience', short: 'UI & UX', icon: '◌', description: 'Design systems, motion, media, and interface behavior.' },
  { id: 'performance', name: 'Performance and reliability', short: 'Performance', icon: '⌁', description: 'Frame budgets, memory, caching, and concurrency.' },
  { id: 'observability', name: 'Observability', short: 'Observability', icon: '◉', description: 'Analytics, crashes, and production diagnostics.' },
  { id: 'platform', name: 'Networking, navigation, and platform capabilities', short: 'Platform', icon: '⇄', description: 'HTTP, routing, links, web content, and device permissions.' },
  { id: 'storage', name: 'Storage and dependency injection', short: 'Storage', icon: '▤', description: 'Databases, files, persisted state, and dependency lifetimes.' },
  { id: 'security', name: 'Security', short: 'Security', icon: '⬡', description: 'Credentials, application security, and release hardening.' },
  { id: 'testing', name: 'Testing and delivery', short: 'Testing', icon: '✓', description: 'What to prove before a release goes out.' },
];

const skills = [
  {
    "name": "Dart args",
    "slug": "dart-args-production-cli",
    "group": "foundations",
    "mark": "AR",
    "description": "production command-line interfaces, subcommands, flags, and executable tooling"
  },
  {
    "name": "Dart & Flutter Equatable",
    "slug": "dart-flutter-equatable-engineering",
    "group": "foundations",
    "mark": "EQ",
    "description": "value equality, immutable state, and reliable rebuild behavior"
  },
  {
    "name": "Freezed",
    "slug": "freezed-production-engineering",
    "group": "foundations",
    "mark": "FR",
    "description": "immutable models, sealed unions, JSON serialization, and code generation"
  },
  {
    "name": "Dart & Flutter FFI",
    "slug": "dart-flutter-ffi-systems-engineering",
    "group": "foundations",
    "mark": "FF",
    "description": "native integration, memory ownership, ABI safety, and platform packaging"
  },
  {
    "name": "Dart meta",
    "slug": "dart-meta",
    "group": "foundations",
    "mark": "ME",
    "description": "annotations, API contracts, immutability, and analyzer-guided modernization"
  },
  {
    "name": "Senior Flutter architecture",
    "slug": "senior-flutter-architecture",
    "group": "foundations",
    "mark": "SA",
    "description": "production Flutter/Dart architecture with explicit trade-offs",
    "featured": true
  },
  {
    "name": "Design patterns",
    "slug": "shvets-design-patterns",
    "group": "foundations",
    "mark": "DP",
    "description": "22 classic object-oriented patterns, with source-backed decisions, examples, and trade-offs"
  },
  {
    "name": "Senior mobile architecture",
    "slug": "senior-mobile-architecture",
    "group": "foundations",
    "mark": "SM",
    "description": "architecture reviews and refactoring across iOS, Android, and cross-platform apps"
  },
  {
    "name": "Flutter production engineering",
    "slug": "flutter-production-engineering",
    "group": "foundations",
    "mark": "PE",
    "description": "architecture, performance, scalability, cross-platform behavior, testing, profiling, and maintainability",
    "featured": true
  },
  {
    "name": "Flutter multi-environment",
    "slug": "flutter-multi-environment",
    "group": "foundations",
    "mark": "ME",
    "description": "development, staging, and production flavors, configuration, and delivery pipelines"
  },
  {
    "name": "Flutter package selection",
    "slug": "flutter-package-plugin-selection",
    "group": "foundations",
    "mark": "PS",
    "description": "evidence-based dependency evaluation and migration decisions"
  },
  {
    "name": "Flutter/Dart package engineering",
    "slug": "flutter-dart-package-engineering",
    "group": "foundations",
    "mark": "PE",
    "description": "design, test, version, and publish Dart packages, Flutter packages, plugins, FFI packages, and federated plugins"
  },
  {
    "name": "Flutter lints & static analysis",
    "slug": "flutter-lints-static-analysis-engineering",
    "group": "foundations",
    "mark": "LS",
    "description": "analyzer configuration, lint governance, and CI quality gates"
  },
  {
    "name": "Flutter production build & release",
    "slug": "flutter-production-build-release",
    "group": "foundations",
    "mark": "PB",
    "description": "production builds, signing, packaging, stores, and release recovery"
  },
  {
    "name": "Flutter Firebase Core",
    "slug": "flutter-firebase-core-engineering",
    "group": "foundations",
    "mark": "FC",
    "description": "Firebase bootstrap, generated configuration, environments, and app-instance lifecycle"
  },
  {
    "name": "Flutter mobile development",
    "slug": "flutter-mobile-development",
    "group": "foundations",
    "mark": "MD",
    "description": "practical Flutter delivery across app structure, UI, state, platform, testing, and release work"
  },
  {
    "name": "Figma to Flutter",
    "slug": "figma-to-flutter-expert",
    "group": "ui",
    "mark": "FT",
    "description": "Flutter implementation of Figma frames, Auto Layout, tokens, and responsive multi-platform UI",
    "featured": true
  },
  {
    "name": "HTML to Flutter",
    "slug": "html-to-flutter",
    "group": "ui",
    "mark": "HT",
    "description": "production Flutter ports of HTML/CSS/JavaScript interfaces"
  },
  {
    "name": "React to Flutter",
    "slug": "react-to-flutter",
    "group": "ui",
    "mark": "RT",
    "description": "behavior-preserving React web migrations to Flutter"
  },
  {
    "name": "Flutter animations",
    "slug": "flutter-animations-production-engineering",
    "group": "ui",
    "mark": "AN",
    "description": "Material motion, transitions, accessibility, and animation performance"
  },
  {
    "name": "Flutter motion engineering",
    "slug": "flutter-motion-engineering",
    "group": "ui",
    "mark": "ME",
    "description": "interaction continuity, interruptible springs, platform transitions, rendering diagnostics, accessibility, and tested Dart examples"
  },
  {
    "name": "Rive Flutter",
    "slug": "rive-flutter",
    "group": "ui",
    "mark": "RI",
    "description": "C++ runtime integration, state machines, inputs, layout, lifecycle, and multi-platform rendering with `rive`"
  },
  {
    "name": "Lottie for Flutter",
    "slug": "lottie-flutter",
    "group": "ui",
    "mark": "LO",
    "description": "pure Dart vector animations, composition caching, frame-rate throttling, dynamic delegates, marker playback, and list performance with `lottie`"
  },
  {
    "name": "Flutter Confetti",
    "slug": "flutter-confetti-engineering",
    "group": "ui",
    "mark": "CO",
    "description": "lifecycle-safe, accessible celebration effects and particle performance"
  },
  {
    "name": "Flutter native splash",
    "slug": "flutter-native-splash-engineering",
    "group": "ui",
    "mark": "NS",
    "description": "Android, iOS, and web launch resources, transitions, flavors, and startup behavior"
  },
  {
    "name": "Flutter app icon",
    "slug": "flutter-app-icon-engineering",
    "group": "ui",
    "mark": "IC",
    "description": "cross-platform launcher icon design, adaptive and themed Android icons, Apple asset catalogs, web, desktop, and automation"
  },
  {
    "name": "Flutter image performance",
    "slug": "flutter-image-performance",
    "group": "ui",
    "mark": "IP",
    "description": "image loading, decoding, caching, rendering, and memory use"
  },
  {
    "name": "Flutter image_picker",
    "slug": "flutter-image-picker-production-engineering",
    "group": "ui",
    "mark": "IP",
    "description": "photo and video acquisition, lost-data recovery, platform behavior, and media safety"
  },
  {
    "name": "document_scan for Flutter",
    "slug": "document-scan-flutter",
    "group": "ui",
    "mark": "DS",
    "description": "headless document detection, perspective correction, live camera frames, and scan testing on Android and iOS"
  },
  {
    "name": "document_camera_frame",
    "slug": "document-camera-frame",
    "group": "ui",
    "mark": "DC",
    "description": "framed camera, auto-capture alignment, on-device OCR, multi-page PDF or image export, and native document scanning"
  },
  {
    "name": "flutter_doc_scanner",
    "slug": "flutter-doc-scanner",
    "group": "ui",
    "mark": "DS",
    "description": "native ML Kit and VisionKit document scanning, multi-page image capture, and PDF compilation on Android and iOS"
  },
  {
    "name": "Flutter pro_image_editor",
    "slug": "flutter-pro-image-editor-engineering",
    "group": "ui",
    "mark": "PI",
    "description": "image editing, state persistence, export, privacy, and large-image performance"
  },
  {
    "name": "Flutter video_player",
    "slug": "flutter-video-player-production-engineering",
    "group": "ui",
    "mark": "VP",
    "description": "cross-platform playback, controller lifecycle, streaming, codecs, and decoder performance"
  },
  {
    "name": "Flutter CamerAwesome",
    "slug": "camerawesome-flutter",
    "group": "ui",
    "mark": "CA",
    "description": "camera preview, capture modes, ML Kit image analysis, orientation, and CameraX/AVFoundation performance"
  },
  {
    "name": "Flutter Skeletonizer",
    "slug": "flutter-skeletonizer-engineering",
    "group": "ui",
    "mark": "SK",
    "description": "accessible loading states"
  },
  {
    "name": "Flutter SVG",
    "slug": "flutter-svg-engineering",
    "group": "ui",
    "mark": "SV",
    "description": "rendering, theming, caching, performance, and SVG security"
  },
  {
    "name": "Flutter Pinput",
    "slug": "flutter-pinput",
    "group": "ui",
    "mark": "PI",
    "description": "PIN, OTP, and SMS verification fields with iOS and Android autofill, custom cursors, animations, and accessible theming"
  },
  {
    "name": "Persian number utility",
    "slug": "persian-number-utility",
    "group": "ui",
    "mark": "PN",
    "description": "Persian and Arabic digit normalization, number-to-words, Jalali dates, currency, and Iranian identifier validation"
  },
  {
    "name": "Flutter design system from design.md",
    "slug": "flutter-design-system-from-design-md",
    "group": "ui",
    "mark": "DS",
    "description": "turning a `design.md` spec into Flutter theme tokens, components, states, and validation checks"
  },
  {
    "name": "Flutter expert tips",
    "slug": "flutter-expert-tips",
    "group": "performance",
    "mark": "ET",
    "description": "practical implementation, debugging, refactoring, and modernization"
  },
  {
    "name": "Flutter concurrency, memory & performance",
    "slug": "flutter-concurrency-memory-performance",
    "group": "performance",
    "mark": "CM",
    "description": "isolates, async workflows, lifecycle management, and resource efficiency"
  },
  {
    "name": "Flutter caching",
    "slug": "flutter-caching-engineering",
    "group": "performance",
    "mark": "CA",
    "description": "cache policy, invalidation, offline data, HTTP freshness, and resource bounds"
  },
  {
    "name": "Mobile API caching",
    "slug": "mobile-api-caching",
    "group": "performance",
    "mark": "MA",
    "description": "cache strategy, HTTP semantics, offline synchronization, and account isolation for iOS, Android, Flutter, React Native, and Kotlin Multiplatform"
  },
  {
    "name": "Mobile app shrinking & release optimization",
    "slug": "mobile-app-shrinking-and-release-optimization",
    "group": "performance",
    "mark": "MA",
    "description": "R8 keep rules, resource and dependency reduction, native symbols, app thinning, tree shaking, and release validation across Android, iOS, Flutter, React Native, and Kotlin Multiplatform"
  },
  {
    "name": "Flutter jank optimization",
    "slug": "flutter-performance-jank-optimization",
    "group": "performance",
    "mark": "JO",
    "description": "profiling and fixing dropped frames, slow scrolling, and latency"
  },
  {
    "name": "Flutter UI performance",
    "slug": "flutter-ui-performance-engineering",
    "group": "performance",
    "mark": "UP",
    "description": "frame-budget analysis, rebuild, layout, paint, and raster optimization, and production profiling",
    "featured": true
  },
  {
    "name": "Flutter memory leaks",
    "slug": "flutter-memory-leak-engineering",
    "group": "performance",
    "mark": "ML",
    "description": "lifecycle defects, leak tracking, and regression prevention"
  },
  {
    "name": "Flutter Squadron concurrency",
    "slug": "flutter-squadron-concurrency-engineering",
    "group": "performance",
    "mark": "SC",
    "description": "workers, worker pools, cancellation, and web workers"
  },
  {
    "name": "Flutter Firebase Analytics",
    "slug": "flutter-firebase-analytics",
    "group": "observability",
    "mark": "FA",
    "description": "product-event schemas, consent, identity, screen and ecommerce measurement, DebugView, and reporting quality"
  },
  {
    "name": "Flutter Sentry",
    "slug": "flutter-sentry-engineering",
    "group": "observability",
    "mark": "SE",
    "description": "crash reporting, tracing, symbolication, privacy, and production observability"
  },
  {
    "name": "Flutter production logging",
    "slug": "flutter-production-logging",
    "group": "observability",
    "mark": "PL",
    "description": "structured, privacy-conscious diagnostics and error reporting"
  },
  {
    "name": "Flutter Firebase Messaging",
    "slug": "flutter-firebase-messaging",
    "group": "platform",
    "mark": "FM",
    "description": "FCM delivery across Android, iOS, macOS, and web"
  },
  {
    "name": "Flutter Dio",
    "slug": "flutter-dio-engineering",
    "group": "platform",
    "mark": "DI",
    "description": "production HTTP clients, auth, retries, transfers, and observability",
    "featured": true
  },
  {
    "name": "Flutter Dio cache interceptor",
    "slug": "flutter-dio-cache-interceptor-engineering",
    "group": "platform",
    "mark": "DC",
    "description": "HTTP caching, revalidation, store selection, offline fallback, key isolation, and invalidation with `dio_cache_interceptor`"
  },
  {
    "name": "Flutter go_router",
    "slug": "flutter-go-router-engineering",
    "group": "platform",
    "mark": "GR",
    "description": "routing, deep links, redirects, nested navigation, and web URLs",
    "featured": true
  },
  {
    "name": "Flutter app links",
    "slug": "flutter-app-links-deep-link-engineering",
    "group": "platform",
    "mark": "AL",
    "description": "Universal Links, Android App Links, and secure link delivery"
  },
  {
    "name": "Flutter url_launcher",
    "slug": "flutter-url-launcher-engineering",
    "group": "platform",
    "mark": "UL",
    "description": "external URI handling across platforms"
  },
  {
    "name": "Flutter share_plus",
    "slug": "flutter-share-plus-engineering",
    "group": "platform",
    "mark": "SP",
    "description": "cross-platform text, URI, file, and generated-content sharing"
  },
  {
    "name": "Flutter WebView",
    "slug": "flutter-webview-production-engineering",
    "group": "platform",
    "mark": "WE",
    "description": "embedded web content, navigation policy, security, and lifecycle"
  },
  {
    "name": "Flutter local notifications",
    "slug": "flutter-local-notifications-production-engineering",
    "group": "platform",
    "mark": "LN",
    "description": "permissions, scheduling, time zones, interactions, and recovery"
  },
  {
    "name": "Flutter permission_handler",
    "slug": "flutter-permission-handler-engineering",
    "group": "platform",
    "mark": "PH",
    "description": "runtime permissions, platform configuration, and privacy-aware flows"
  },
  {
    "name": "Flutter Supabase",
    "slug": "flutter-supabase-engineering",
    "group": "storage",
    "mark": "SU",
    "description": "Auth, row-level security, database access, Realtime, Storage, Edge Functions, and production security"
  },
  {
    "name": "Flutter Drift",
    "slug": "flutter-drift-persistence-engineering",
    "group": "storage",
    "mark": "DR",
    "description": "relational persistence, reactive queries, migrations, concurrency, and cross-platform SQLite"
  },
  {
    "name": "Flutter Hive",
    "slug": "flutter-hive-persistence-engineering",
    "group": "storage",
    "mark": "HI",
    "description": "local persistence, schema changes, encryption, and recovery"
  },
  {
    "name": "hydrated_bloc",
    "slug": "hydrated-bloc",
    "group": "storage",
    "mark": "HB",
    "description": "Bloc and Cubit state persistence, keys, schema evolution, security, and testing"
  },
  {
    "name": "Flutter path_provider",
    "slug": "flutter-path-provider-production-storage",
    "group": "storage",
    "mark": "PP",
    "description": "durable filesystem storage and cleanup"
  },
  {
    "name": "Flutter get_it & injectable",
    "slug": "flutter-get-it-injectable-dependency-injection",
    "group": "storage",
    "mark": "GI",
    "description": "dependency lifetimes, scopes, startup, and testing"
  },
  {
    "name": "Flutter secure storage",
    "slug": "flutter-secure-storage-security-engineering",
    "group": "security",
    "mark": "SS",
    "description": "protected credentials and platform key stores"
  },
  {
    "name": "Flutter application security",
    "slug": "flutter-application-security-engineering",
    "group": "security",
    "mark": "AS",
    "description": "application security reviews and remediation"
  },
  {
    "name": "Flutter app hardening",
    "slug": "flutter-app-hardening-reverse-engineering",
    "group": "security",
    "mark": "AH",
    "description": "reverse-engineering resistance, tamper protection, and secure releases"
  },
  {
    "name": "Test before deploy",
    "slug": "test-before-deploy",
    "group": "testing",
    "mark": "TB",
    "description": "release-ready test selection using the \"34 Test Before Deploy\" taxonomy"
  }
];

const selectedSkills = new Set();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function sentence(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function skillCount(groupId) {
  return skills.filter(skill => skill.group === groupId).length;
}

function countLabel(count) {
  return `${count} ${count === 1 ? 'skill' : 'skills'}`;
}

document.querySelector('[data-stat="skills"]').textContent = String(skills.length);
document.querySelector('[data-stat="collections"]').textContent = String(categories.length);
document.querySelectorAll('[data-count]').forEach(element => {
  element.textContent = countLabel(skillCount(element.dataset.count));
});

const categoryGrid = document.querySelector('#category-grid');
categoryGrid.innerHTML = categories.map((category, index) => `<a class="category-card reveal" style="animation-delay:${index * 0.05}s" href="#group-${category.id}" data-group="${category.id}"><span class="category-count">${countLabel(skillCount(category.id))}</span><span class="category-icon" aria-hidden="true">${category.icon}</span><h3>${escapeHtml(category.short)}</h3><p>${escapeHtml(category.description)}</p></a>`).join('');

const filterWrap = document.querySelector('#filter-wrap');
let activeFilter = 'all';
let activeCommand = 'curl';
const filters = [{ id: 'all', short: 'All', count: skills.length }, ...categories.map(category => ({ id: category.id, short: category.short, count: skillCount(category.id) }))];
filterWrap.innerHTML = filters.map(filter => `<button class="filter-button${filter.id === 'all' ? ' active' : ''}" type="button" data-filter="${filter.id}" aria-pressed="${filter.id === 'all'}">${escapeHtml(filter.short)} <span class="filter-count">${filter.count}</span></button>`).join('');

const groupsRoot = document.querySelector('#skill-groups');
const emptyState = document.querySelector('#empty-state');
const catalogCount = document.querySelector('#catalog-count');
const search = document.querySelector('#skill-search');
const selectionBar = document.querySelector('#selection-bar');
const selectionCount = document.querySelector('#selection-count');
const commandPanel = document.querySelector('#command-panel');
const commandOutput = document.querySelector('#install-commands code');
const commandNote = document.querySelector('#command-note');
const copyStatus = document.querySelector('#copy-status');

function categoryOf(skill) {
  return categories.find(category => category.id === skill.group);
}

function matches(skill, query) {
  if (!query) return true;
  const category = categoryOf(skill);
  return [skill.name, skill.slug, skill.description, category.short, category.name].some(value => value.toLowerCase().includes(query));
}

function renderSkills() {
  const query = search.value.trim().toLowerCase();
  let shown = 0;
  groupsRoot.innerHTML = categories.filter(category => activeFilter === 'all' || category.id === activeFilter).map(category => {
    const visible = skills.filter(skill => skill.group === category.id && matches(skill, query));
    if (!visible.length) return '';
    shown += visible.length;
    const cards = visible.map(skill => {
      const selected = selectedSkills.has(skill.slug);
      const source = `https://github.com/${repository}/blob/main/skills/${skill.slug}/SKILL.md`;
      return `<article class="skill-card${selected ? ' selected' : ''}"><button class="skill-hit" type="button" data-skill="${skill.slug}" aria-pressed="${selected}"><span class="skill-top"><span class="skill-logo" aria-hidden="true">${escapeHtml(skill.mark)}</span><span class="skill-select-mark" aria-hidden="true">✓</span></span><h3>${escapeHtml(skill.name)}${skill.featured ? ' <span class="featured-star" aria-hidden="true">✦</span>' : ''}</h3><p>${escapeHtml(sentence(skill.description))}</p></button><div class="skill-foot"><span class="skill-slug" title="${escapeHtml(skill.slug)}">${escapeHtml(skill.slug)}</span><a class="skill-source" href="${source}" target="_blank" rel="noreferrer" aria-label="Source for ${escapeHtml(skill.name)}">Source</a></div></article>`;
    }).join('');
    return `<section class="skill-group" id="group-${category.id}"><div class="group-kicker"><h3><span class="group-mark" aria-hidden="true">${category.icon}</span><span class="group-name">${escapeHtml(category.name)}</span></h3><p>${countLabel(visible.length)}</p></div><div class="skill-grid">${cards}</div></section>`;
  }).join('');
  emptyState.hidden = shown > 0;
  catalogCount.textContent = query || activeFilter !== 'all' ? `Showing ${shown} of ${skills.length}` : countLabel(skills.length);
  updateSelectionBar();
}

function syncFilters() {
  document.querySelectorAll('.filter-button').forEach(item => {
    const on = item.dataset.filter === activeFilter;
    item.classList.toggle('active', on);
    item.setAttribute('aria-pressed', String(on));
  });
}

function updateSelectionBar() {
  const count = selectedSkills.size;
  selectionCount.textContent = String(count);
  selectionBar.hidden = count === 0;
  document.body.classList.toggle('has-selection', count > 0);
  if (count === 0) commandPanel.hidden = true;
  else if (!commandPanel.hidden) renderCommand();
}

function buildInstallCommands() {
  const dirs = [...selectedSkills];
  if (activeCommand === 'npx') return `npx degit ${repository}/skills ./selected-skills`;
  if (activeCommand === 'git') {
    return [
      'mkdir -p ./selected-skills',
      `git clone --filter=blob:none --sparse https://github.com/${repository}.git ./flutter-skills-install`,
      `git -C ./flutter-skills-install sparse-checkout set --no-cone ${dirs.map(dir => `skills/${dir}`).join(' ')}`,
      ...dirs.map(dir => `cp -R ./flutter-skills-install/skills/${dir} ./selected-skills/`),
    ].join('\n');
  }
  const url = `https://codeload.github.com/${repository}/tar.gz/refs/heads/main`;
  const paths = dirs.map(dir => `flutter-skills-main/skills/${dir}`).join(' ');
  const fetch = activeCommand === 'wget' ? `wget -qO- "${url}"` : `curl -fL "${url}"`;
  return `mkdir -p ./selected-skills\n${fetch} | tar -xz -C ./selected-skills --strip-components=2 ${paths}`;
}

function renderCommand() {
  commandOutput.textContent = buildInstallCommands();
  commandNote.innerHTML = activeCommand === 'npx'
    ? 'The <code>npx</code> command fetches the complete <code>skills/</code> folder. Use <code>curl</code>, <code>wget</code>, or <code>git</code> when you need only the selected skill folders.'
    : 'These commands download the selected skill folders into <code>./selected-skills</code>. Each folder contains <code>SKILL.md</code>. Copy a folder into your AI coding tool’s skills directory.';
}

function scrollToGroup(id) {
  if (activeFilter !== 'all' || search.value) {
    activeFilter = 'all';
    search.value = '';
    syncFilters();
    renderSkills();
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.getElementById(id)?.scrollIntoView({ behavior: motion, block: 'start' });
}

groupsRoot.addEventListener('click', event => {
  const hit = event.target.closest('[data-skill]');
  if (!hit) return;
  const slug = hit.dataset.skill;
  selectedSkills.has(slug) ? selectedSkills.delete(slug) : selectedSkills.add(slug);
  renderSkills();
  document.querySelector(`[data-skill="${CSS.escape(slug)}"]`)?.focus();
});

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#group-"]');
  if (!link) return;
  event.preventDefault();
  const id = link.getAttribute('href').slice(1);
  scrollToGroup(id);
  history.replaceState(null, '', `#${id}`);
});

document.querySelector('#clear-selection').addEventListener('click', () => {
  selectedSkills.clear();
  commandPanel.hidden = true;
  renderSkills();
});

document.querySelector('#generate-commands').addEventListener('click', () => {
  renderCommand();
  commandPanel.hidden = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  commandPanel.scrollIntoView({ behavior: motion, block: 'nearest' });
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
  syncFilters();
  renderSkills();
});

search.addEventListener('input', renderSkills);

const menuButton = document.querySelector('.menu-button');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  document.querySelector('.nav-links').classList.toggle('mobile-open', !open);
});

renderSkills();
if (location.hash.startsWith('#group-')) scrollToGroup(location.hash.slice(1));
