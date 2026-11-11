(() => {
  'use strict';
  const D = window.WorkspaceData, $ = id => document.getElementById(id);
  const app = document.querySelector('.app');
  const TTL = 15 * 60 * 1000;
  let user = 'Peterachss', current = 'home', repos = [], stars = [], pins = [], custom = [], limit = 40;
  let controller, generation = 0, enabled = true, lastTrigger = $('directoryBtn');
  let status = { repos: 'Not loaded', stars: 'Not loaded' };
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  function node(tag, text, className) {
    const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el;
  }
  function link(text, url, className) {
    const a = node('a', text, className); a.href = D.safeURL(url) || 'https://github.com'; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function toast(message) { $('workspaceToast').textContent = message; $('workspaceToast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { $('workspaceToast').hidden = true; }, 3500); }
  function persist() {
    if (!write('isocity-workspace:' + user.toLowerCase(), { pins, custom })) toast('Shortcuts work this session, but browser storage is unavailable.');
  }
  function preferences() {
    const saved = read('isocity-workspace:' + user.toLowerCase());
    pins = Array.isArray(saved?.pins) ? saved.pins.filter(r => r && typeof r.name === 'string' && D.safeURL(r.url)).slice(0, 500) : [];
    custom = Array.isArray(saved?.custom) ? saved.custom.filter(r => r && typeof r.name === 'string' && D.safeURL(r.url) && D.departments.some(d=>d.id===r.department)).slice(0, 500) : [];
  }
  function quickLinks() {
    const base = 'https://github.com/' + encodeURIComponent(user);
    $('githubLinks').replaceChildren(link('All repositories on GitHub', base+'?tab=repositories'), link('All stars on GitHub', 'https://github.com/stars/'+encodeURIComponent(user)), link('Private & team repositories', 'https://github.com/dashboard'));
  }
  function staticTools() {
    const encoded = encodeURIComponent(user);
    const entry = (name, description, url) => ({name,description,url,language:'',stars:0,updated:'',static:true});
    return current === 'ops' ? [
      entry('Assigned issues','Your open work across repositories.', 'https://github.com/issues?q='+encodeURIComponent('is:open is:issue assignee:'+user)),
      entry('Review requests','Pull requests waiting for your review.', 'https://github.com/pulls?q='+encodeURIComponent('is:open is:pr review-requested:'+user)),
      entry('Your pull requests','Follow changes you have proposed.', 'https://github.com/pulls?q='+encodeURIComponent('is:pr author:'+user)),
      entry('Notifications','Updates from repositories you follow.', 'https://github.com/notifications')
    ] : [
      entry('Codespaces','Open your cloud development environments.', 'https://github.com/codespaces'),
      entry('Projects','Plan and track work on GitHub.', 'https://github.com/'+encoded+'?tab=projects'),
      entry('Gists','Your snippets and small experiments.', 'https://gist.github.com/'+encoded),
      entry('GitHub documentation','Find guides and product documentation.', 'https://docs.github.com')
    ];
  }
  function itemsForDepartment() {
    const extras = custom.filter(r => r.department === current);
    let base = current === 'repos' ? repos : current === 'stars' ? stars : current === 'home' ? pins : current === 'launch' ? repos.filter(r=>r.website).map(r=>({...r,url:r.website,repoURL:r.url})) : staticTools();
    return [...extras, ...base];
  }
  function card(item) {
    const row = node('article', null, 'workspace-result');
    const heading = node('div', null, 'workspace-result-heading');
    heading.append(link(item.name,item.url,'workspace-result-title'));
    if (!item.static && !item.custom) {
      const pinned = pins.some(p=>p.name===item.name);
      const button = node('button', pinned ? 'Pinned' : 'Pin', 'pin-button');
      button.setAttribute('aria-pressed',String(pinned)); button.setAttribute('aria-label',(pinned?'Unpin ':'Pin ')+item.name);
      button.onclick=()=>{ if(pinned) pins=pins.filter(p=>p.name!==item.name); else pins.push({...item}); persist(); render(); };
      heading.append(button);
    } else if(item.custom) {
      const button=node('button','Remove','pin-button');button.setAttribute('aria-label','Remove '+item.name);
      button.onclick=()=>{custom=custom.filter(r=>r.id!==item.id);persist();render();};heading.append(button);
    }
    row.append(heading);
    if(item.description) row.append(node('p',item.description,'workspace-result-description'));
    if(!item.static && !item.custom) {
      const meta=node('p',[item.language||'No language listed',`${item.stars} stars`,item.archived?'Archived':''].filter(Boolean).join(' / '),'workspace-result-meta');row.append(meta);
      const tools=node('div',null,'repo-tools');const base=item.repoURL||('https://github.com/'+item.name);
      for(const [label,path] of [['Code',''],['Issues','/issues'],['PRs','/pulls'],['Actions','/actions']]) tools.append(link(label,base+path));
      if(item.website && current!=='launch')tools.append(link('Website',item.website));row.append(tools);
    }
    return row;
  }
  function render() {
    const department=D.departments.find(d=>d.id===current);
    $('workspaceTitle').textContent=department.name;
    $('workspaceDescription').textContent=department.description;
    for(const button of $('departmentDock').children) button.setAttribute('aria-pressed',String(button.dataset.department===current));
    const all=itemsForDepartment();
    const selected=$('languageFilter').value;
    const languages=[...new Set(all.map(r=>r.language).filter(Boolean))].sort();
    $('languageFilter').replaceChildren(new Option('All languages',''), ...languages.map(l=>new Option(l,l)));
    $('languageFilter').value=languages.includes(selected)?selected:'';
    $('languageFilter').hidden=!['repos','stars','home','launch'].includes(current);
    const items=D.filtered(all,$('workspaceSearch').value,$('languageFilter').value,$('sortRepos').value);
    const container=$('workspaceList');container.replaceChildren();
    if(!items.length) {
      const message = $('workspaceSearch').value || $('languageFilter').value ? 'No matches. Try a different name or language.'
        : current==='home' ? 'Pin a repository or starred project to keep it here. You can also add your own shortcut below.'
        : current==='launch' ? 'No repository websites listed yet. Add your deployment URL as a shortcut below.'
        : current==='stars' ? 'No starred projects loaded yet. Use Refresh or open your stars on GitHub.'
        : 'No repositories loaded yet. Use Refresh or open GitHub directly.';
      container.append(node('p',message,'workspace-empty'));
      if(current==='home' && !$('workspaceSearch').value) {
        const button=node('button','Browse repositories','workspace-primary');button.onclick=()=>openDepartment('repos');container.append(button);
      }
    } else {
      container.append(node('p',`${items.length} result${items.length===1?'':'s'}${items.length>limit?` / showing ${limit}`:''}`,'workspace-result-count'));
      for(const item of items.slice(0,limit))container.append(card(item));
    }
    $('moreResults').hidden=items.length<=limit;
    $('githubStatus').textContent=`Repositories: ${status.repos}. Stars: ${status.stars}.`;
  }
  function setPanel(open) {
    $('workspacePanel').hidden=!open;
    $('directoryBtn').setAttribute('aria-expanded',String(open));
    document.body.dataset.directory=String(open);
    if(!open)lastTrigger?.focus();
  }
  function openDepartment(id,focus=false) {
    if(!D.departments.some(d=>d.id===id))return;
    current=id;limit=40;$('workspaceSearch').value='';$('languageFilter').value='';
    setMode(true);setPanel(true);render();
    if(focus)window.Isocity.focusBuilding(D.departments.find(d=>d.id===id).types);
    $('workspacePanel').scrollTop=0;
  }
  function setMode(workspace) {
    enabled=workspace;app.dataset.workspace=String(workspace);document.body.dataset.workspace=String(workspace);
    $('workspaceMode').setAttribute('aria-pressed',String(workspace));$('buildMode').setAttribute('aria-pressed',String(!workspace));
    $('departmentDock').hidden=!workspace;window.Isocity.setWorkspace(workspace);
    if(!workspace)setPanel(false);
  }
  function cachedItems(rows) {
    return Array.isArray(rows) ? rows.filter(r=>r && typeof r.name==='string' && /^[\w.-]+\/[\w.-]+$/.test(r.name) && D.safeURL(r.url)).map(r=>({...r,stars:Number(r.stars)||0,description:String(r.description||''),language:String(r.language||''),updated:String(r.updated||''),website:D.safeURL(r.website)})) : [];
  }
  async function load(force=false) {
    const requested=$('githubUser').value.trim();
    if(!D.validUser(requested)){toast('Enter a valid GitHub username.');return;}
    controller?.abort();controller=new AbortController();const signal=controller.signal,version=++generation;
    user=requested;preferences();write('isocity-workspace-user',user);quickLinks();
    const cached=read('isocity-workspace-cache:'+user.toLowerCase());
    repos=cachedItems(cached?.repos);stars=cachedItems(cached?.stars);
    if(!force && cached?.complete && Number.isFinite(cached.at) && Date.now()-cached.at<TTL){status={repos:`${repos.length} loaded (cached)`,stars:`${stars.length} loaded (cached)`};render();return;}
    status={repos:repos.length?`${repos.length} cached; refreshing`:'Loading',stars:stars.length?`${stars.length} cached; refreshing`:'Loading'};render();
    let timedOut=false;
    const activeController=controller;
    const timeout=setTimeout(()=>{timedOut=true;activeController.abort();},20000);
    const results=await Promise.allSettled(['repos','stars'].map(async key=>{
      const rows=await D.fetchCatalog(user,key==='stars'?'starred':'repos',{signal,onPage:items=>{
        if(version!==generation)return;
        if(key==='repos')repos=items;else stars=items;
        status[key]=`${items.length} loaded; fetching remaining pages`;render();
      }});
      if(version!==generation)return;
      if(key==='repos')repos=rows;else stars=rows;
      status[key]=`${rows.length} loaded`;render();
    }));
    clearTimeout(timeout);
    if(version!==generation)return;
    results.forEach((r,i)=>{if(r.status==='rejected')status[i?'stars':'repos']=r.reason.name==='AbortError'?(timedOut?'Connection timed out. Try Refresh or open GitHub directly.':'Cancelled'):r.reason.message || 'Connection failed. Try Refresh.';});
    const complete=results.every(r=>r.status==='fulfilled');
    if(complete)write('isocity-workspace-cache:'+user.toLowerCase(),{at:Date.now(),repos,stars,complete});
    render();
  }
  for(const dept of D.departments) {
    const button=node('button',null,'department-button');button.dataset.department=dept.id;
    button.setAttribute('aria-label',dept.name+' - '+dept.description);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',dept.path);svg.append(path);button.append(svg,node('span',dept.short));
    button.onclick=()=>{lastTrigger=button;openDepartment(dept.id,true);};$('departmentDock').append(button);
  }
  $('workspaceMode').onclick=()=>{setMode(true);setPanel(true);};
  $('buildMode').onclick=()=>setMode(false);
  $('directoryBtn').onclick=()=>{lastTrigger=$('directoryBtn');setMode(true);setPanel($('workspacePanel').hidden);if(!$('workspacePanel').hidden)$('workspaceSearch').focus();};
  $('closeWorkspace').onclick=()=>setPanel(false);
  $('accountForm').onsubmit=e=>{e.preventDefault();load();};$('refreshGithub').onclick=()=>load(true);
  $('workspaceSearch').oninput=()=>{limit=40;render();};$('languageFilter').onchange=()=>{limit=40;render();};$('sortRepos').onchange=()=>{limit=40;render();};
  $('moreResults').onclick=()=>{limit+=40;render();};
  $('shortcutForm').onsubmit=e=>{
    e.preventDefault();const name=$('shortcutName').value.trim(),url=D.safeURL($('shortcutURL').value.trim());
    if(!name||!url){toast('Use a name and an http or https link.');return;}
    custom.unshift({id:crypto.randomUUID(),name,url,department:current,custom:true,description:'Your shortcut',language:'',stars:0,updated:new Date().toISOString()});
    persist();$('shortcutForm').reset();$('shortcutDetails').open=false;render();toast('Shortcut saved in this browser.');
  };
  addEventListener('isocity:building',e=>{const dept=D.departments.find(d=>d.types.includes(e.detail.type));if(dept){lastTrigger=$('directoryBtn');openDepartment(dept.id);$('workspaceDescription').textContent=dept.description+` Building ${e.detail.x+1}, ${e.detail.y+1}.`;}});
  addEventListener('keydown',e=>{
    if(e.key==='Escape' && enabled){setPanel(false);return;}
    if(e.target.matches('input,textarea,select,[contenteditable]'))return;
    if(e.key==='/' && !e.ctrlKey && !e.metaKey){e.preventDefault();lastTrigger=$('directoryBtn');setMode(true);setPanel(true);$('workspaceSearch').focus();}
  });
  const savedUser=read('isocity-workspace-user');if(D.validUser(savedUser))$('githubUser').value=savedUser;
  setMode(true);setPanel(true);load();
})();
